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

    const { code, slug } = await request.json();
    if (!code) return new Response(JSON.stringify({ success: false, error: 'Kode diperlukan' }), { status: 400, headers: cors });

    const upperCode = code.toUpperCase().trim();

    // Jika ada slug, validasi kode harus milik SubServer tersebut
    let expectedSubId = null;
    if (slug) {
      const slugRaw = await env.KV.get(`slug:${slug}`);
      if (!slugRaw) return new Response(JSON.stringify({ success: false, error: 'Link SubServer tidak valid' }), { status: 404, headers: cors });
      expectedSubId = JSON.parse(slugRaw).subId;
    }

    // Cek admin
    if (upperCode.startsWith('ADMIN-')) {
      const adminSecret = await env.KV.get('admin:secret');
      const trimmedSecret = adminSecret ? adminSecret.trim() : null;
      if (!trimmedSecret || upperCode !== trimmedSecret) {
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
      // Isolasi: kode UTAMA harus cocok dengan SubServer di slug
      if (expectedSubId && ss.subId !== expectedSubId) {
        return new Response(JSON.stringify({ success: false, error: 'Kode tidak valid untuk SubServer ini' }), { status: 403, headers: cors });
      }
      const token = await signJWT({ role: 'utama', contactCode: upperCode, subServerId: ss.subId, subServerName: ss.name, slug: ss.slug }, env.JWT_SECRET);
      await setSession(env.KV, token, { role: 'utama', contactCode: upperCode, subServerId: ss.subId, subServerName: ss.name, slug: ss.slug });
      await auditLog(env.DB, 'utama_login', { code: upperCode, subId: ss.subId, ip });
      return new Response(JSON.stringify({ success: true, role: 'utama', token, session: { role: 'utama', contactCode: upperCode, subServerId: ss.subId, subServerName: ss.name, slug: ss.slug } }), { headers: cors });
    }

    // Cek Kontak USR-
    if (upperCode.startsWith('USR-')) {
      // Jika ada slug: cari hanya di SubServer tersebut (lebih efisien & aman)
      if (expectedSubId) {
        const ownerRaw = await env.KV.get(`subid:${expectedSubId}`);
        const ownerCode = ownerRaw ? ownerRaw.trim() : null;
        if (ownerCode) {
          const key = `sub:${expectedSubId}:contact:${ownerCode}:${upperCode}`;
          const raw = await env.KV.get(key);
          const contact = raw ? JSON.parse(raw) : null;
          if (contact && contact.active) {
            const ss = await getSubServer(env.KV, ownerCode);
            if (ss && ss.active) {
              const token = await signJWT({ role: 'kontak', contactCode: upperCode, subServerId: expectedSubId, subServerName: ss.name, name: contact.name, slug: ss.slug }, env.JWT_SECRET);
              await setSession(env.KV, token, { role: 'kontak', contactCode: upperCode, subServerId: expectedSubId, subServerName: ss.name, name: contact.name, slug: ss.slug });
              await auditLog(env.DB, 'kontak_login', { code: upperCode, subId: expectedSubId, ip });
              return new Response(JSON.stringify({ success: true, role: 'kontak', token, session: { role: 'kontak', contactCode: upperCode, subServerId: expectedSubId, subServerName: ss.name, name: contact.name, slug: ss.slug } }), { headers: cors });
            }
          }
        }
        return new Response(JSON.stringify({ success: false, error: 'Kode tidak valid untuk SubServer ini' }), { status: 401, headers: cors });
      }
      // Tanpa slug: scan semua (admin/debug fallback)
      const list = await env.KV.list({ prefix: 'sub:' });
      for (const key of list.keys) {
        if (key.name.endsWith(`:${upperCode}`)) {
          const raw = await env.KV.get(key.name);
          const contact = raw ? JSON.parse(raw) : null;
          if (!contact || !contact.active) continue;
          const parts = key.name.split(':');
          const subId = parts[1];
          const ownerCode = parts[3];
          const ss = await getSubServer(env.KV, ownerCode);
          if (!ss || !ss.active) continue;
          const token = await signJWT({ role: 'kontak', contactCode: upperCode, subServerId: subId, subServerName: ss.name, name: contact.name, slug: ss.slug }, env.JWT_SECRET);
          await setSession(env.KV, token, { role: 'kontak', contactCode: upperCode, subServerId: subId, subServerName: ss.name, name: contact.name, slug: ss.slug });
          await auditLog(env.DB, 'kontak_login', { code: upperCode, subId, ip });
          return new Response(JSON.stringify({ success: true, role: 'kontak', token, session: { role: 'kontak', contactCode: upperCode, subServerId: subId, subServerName: ss.name, name: contact.name, slug: ss.slug } }), { headers: cors });
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
