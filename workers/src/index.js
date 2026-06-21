import { handleAuth } from './handlers/auth.js';
import { handleAdmin } from './handlers/admin.js';
import { handleContacts } from './handlers/contacts.js';
import { handleChat } from './handlers/chat.js';
import { handleMedia } from './handlers/media.js';
import { handleCleanup } from './cron/cleanup.js';
import { verifyJWT } from './utils/jwt.js';
import { getSession } from './utils/kv.js';
export { SubServer } from './durable-objects/SubServer.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function getSessionFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const session = await getSession(env.KV, token);
  if (session) return session;
  // Fallback: verify JWT langsung
  const payload = await verifyJWT(token, env.JWT_SECRET);
  return payload;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Metrics
    const start = Date.now();

    try {
      let response;

      // WebSocket upgrade — routing ke Durable Object
      if (request.headers.get('Upgrade') === 'websocket') {
        const subServerId = url.searchParams.get('subServerId');
        if (!subServerId) return new Response('subServerId diperlukan', { status: 400 });
        const id = env.SUBSERVER.idFromName(subServerId);
        const stub = env.SUBSERVER.get(id);
        return await stub.fetch(request);
      }

      // Public: lookup SubServer by slug (tanpa auth)
      if (pathname.startsWith('/api/s/') && request.method === 'GET') {
        const slug = pathname.slice(7);
        if (!slug) {
          response = new Response(JSON.stringify({ success: false, error: 'Slug diperlukan' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        } else {
          const raw = await env.KV.get(`slug:${slug}`);
          if (!raw) {
            response = new Response(JSON.stringify({ success: false, error: 'SubServer tidak ditemukan' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
          } else {
            const data = JSON.parse(raw);
            // Hanya return nama — tidak boleh ada info sensitif
            response = new Response(JSON.stringify({ success: true, name: data.name, slug }), { headers: { 'Content-Type': 'application/json' } });
          }
        }
      }
      // Auth endpoints (tidak perlu session)
      else if (pathname.startsWith('/api/auth/')) {
        response = await handleAuth(request, env, pathname);
      }
      // Admin endpoints
      else if (pathname.startsWith('/api/admin/')) {
        const session = await getSessionFromRequest(request, env);
        response = await handleAdmin(request, env, pathname, session);
      }
      // SubServer endpoints
      else if (pathname.startsWith('/api/subserver/')) {
        const session = await getSessionFromRequest(request, env);
        response = await handleContacts(request, env, pathname, session);
      }
      // Chat endpoints
      else if (pathname.startsWith('/api/chat/')) {
        const session = await getSessionFromRequest(request, env);
        response = await handleChat(request, env, pathname, session);
      }
      // Media endpoints
      else if (pathname.startsWith('/api/media/')) {
        const session = await getSessionFromRequest(request, env);
        response = await handleMedia(request, env, pathname, session);
      }
      // Health check
      else if (pathname === '/api/health') {
        response = new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      else {
        response = new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      // Tambah CORS headers ke semua response
      const newHeaders = new Headers(response.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));
      return new Response(response.body, { status: response.status, headers: newHeaders });

    } catch (err) {
      console.error('Worker error:', err.message, err.stack);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCleanup(env));
  }
};
