import { signJWT, verifyJWT } from '../utils/jwt.js';
import { getSubServer, getContact, getSession, setSession, deleteSession } from '../utils/kv.js';
import { checkRateLimit } from '../utils/rateLimit.js';
import { auditLog } from '../utils/audit.js';

export async function handleAuth(request, env, pathname) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (pathname === '/api/auth/validate' && request.method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const allowed = await checkRateLimit(env.KV, `rate:${ip}`, 5, 900);
    if (!allowed) return new Response(JSON.stringify({ success: false, error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' }), { status: 429, headers: cors });

    const { code } = await request.json();
    if (!code) return new Response(JSON.stringify({ success: false, error: 'Kode diperlukan' }), { status: 400, headers: cors });

    const upperCode = code.toUpperCase().trim();

    // Cek admin
    if (upperCode.startsWith('ADMIN-')) {
      const adminSecret = await env.KV.get('admin:secret');
      if (!adminSecret || upperCode !== adminSecret) {
        return new Response(JSON.stringify({ success: false, error: 'Kode tidak valid' }), { status: 401, headers: cors });
      }
      const token = await signJWT({ role: 'admin', code: upperCode }, env.JWT_SECRET);
      await auditLog(env.DB, 'admin_login', { ip });
      return new Response(JSON.stringify({ success: true, role: 'admin', token }), { headers: cors });
    }

    // Cek User Utama
    if (upperCode.startsWith('UTAMA-')) {
      const ss = await getSubServer(env.KV, upperCode);
      if (!ss || !ss.active) return new Response(JSON.stringify({ success: false, error: 'Kode tidak valid atau SubServer tidak aktif' }), { status: 401, headers: cors });
      const token = await signJWT({ role: 'utama', contactCode: upperCode, subServerId: ss.subId, subServerName: ss.name }, env.JWT_SECRET);
      await setSession(env.KV, token, { role: 'utama', contactCode: upperCode, subServerId: ss.subId, subServerName: ss.name });
      await auditLog(env.DB, 'utama_login', { code: upperCode, subId: ss.subId, ip });
      return new Response(JSON.stringify({ success: true, role: 'utama', token, session: { role: 'utama', contactCode: upperCode, subServerId: ss.subId, subServerName: ss.name } }), { headers: cors });
    }

    // Cek Kontak USR-
    if (upperCode.startsWith('USR-')) {
      // Cari di semua subserver (scan KV prefix)
      const list = await env.KV.list({ prefix: 'sub:' });
      for (const key of list.keys) {
        if (key.name.endsWith(`:${upperCode}`)) {
          const raw = await env.KV.get(key.name);
          const contact = raw ? JSON.parse(raw) : null;
          if (!contact || !contact.active) continue;
          // key format: sub:{subId}:contact:{ownerCode}:{contactCode}
          const parts = key.name.split(':');
          const subId = parts[1];
          const ownerCode = parts[3];
          const ss = await getSubServer(env.KV, ownerCode);
          if (!ss || !ss.active) continue;
          const token = await signJWT({ role: 'kontak', contactCode: upperCode, subServerId: subId, subServerName: ss.name, name: contact.name }, env.JWT_SECRET);
          await setSession(env.KV, token, { role: 'kontak', contactCode: upperCode, subServerId: subId, subServerName: ss.name, name: contact.name });
          await auditLog(env.DB, 'kontak_login', { code: upperCode, subId, ip });
          return new Response(JSON.stringify({ success: true, role: 'kontak', token, session: { role: 'kontak', contactCode: upperCode, subServerId: subId, subServerName: ss.name, name: contact.name } }), { headers: cors });
        }
      }
      return new Response(JSON.stringify({ success: false, error: 'Kode tidak valid' }), { status: 401, headers: cors });
    }

    return new Response(JSON.stringify({ success: false, error: 'Format kode tidak valid' }), { status: 400, headers: cors });
  }

  if (pathname === '/api/auth/session' && request.method === 'GET') {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ valid: false }), { headers: cors });
    const session = await getSession(env.KV, token);
    if (!session) return new Response(JSON.stringify({ valid: false }), { headers: cors });
    return new Response(JSON.stringify({ valid: true, session }), { headers: cors });
  }

  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (token) await deleteSession(env.KV, token);
    return new Response(JSON.stringify({ success: true }), { headers: cors });
  }

  return new Response('Not found', { status: 404, headers: cors });
}
