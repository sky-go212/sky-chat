import { getSubServer, setSubServer, setContact } from '../utils/kv.js';
import { auditLog } from '../utils/audit.js';

function generateParent() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

async function getNextContactSeq(kv, ownerCode) {
  const key = `counter:contacts:${ownerCode}`;
  const raw = await kv.get(key);
  const n = raw ? parseInt(raw) + 1 : 1;
  await kv.put(key, String(n));
  return n;
}

export async function handleContacts(request, env, pathname, session) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (!session || session.role !== 'utama') {
    return new Response(JSON.stringify({ success: false, error: 'Hanya User Utama yang bisa kelola kontak' }), { status: 403, headers: cors });
  }

  const { contactCode: ownerCode, subServerId: subId } = session;

  // GET /api/subserver/contacts
  if (pathname === '/api/subserver/contacts' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT * FROM contacts_${subId} ORDER BY created_at DESC`).all();
    return new Response(JSON.stringify({ success: true, contacts: result.results || [] }), { headers: cors });
  }

  // POST /api/subserver/contacts
  if (pathname === '/api/subserver/contacts' && request.method === 'POST') {
    const { name } = await request.json();
    if (!name?.trim()) return new Response(JSON.stringify({ success: false, error: 'Nama wajib diisi' }), { status: 400, headers: cors });

    const ss = await getSubServer(env.KV, ownerCode);
    if (!ss) return new Response(JSON.stringify({ success: false, error: 'SubServer tidak ditemukan' }), { status: 404, headers: cors });

    const existing = await env.DB.prepare(`SELECT COUNT(*) as c FROM contacts_${subId} WHERE is_active = 1`).first();
    if ((existing?.c || 0) >= ss.maxContacts) return new Response(JSON.stringify({ success: false, error: `Batas kontak (${ss.maxContacts}) tercapai` }), { status: 400, headers: cors });

    const parent = generateParent();
    const seq = await getNextContactSeq(env.KV, ownerCode);
    const contactCode = `USR-${parent}-${String(seq).padStart(3, '0')}`;

    await env.DB.prepare(`INSERT INTO contacts_${subId} (contact_code, name, added_by) VALUES (?, ?, 'UTAMA')`).bind(contactCode, name.trim()).run();
    await setContact(env.KV, subId, ownerCode, contactCode, { name: name.trim(), active: true, joinedAt: Date.now() });

    // Update contact count
    ss.contactCount = (ss.contactCount || 0) + 1;
    await setSubServer(env.KV, ownerCode, ss);

    const contact = { contact_code: contactCode, name: name.trim(), is_active: 1, created_at: new Date().toISOString() };
    await auditLog(env.DB, 'contact_added', { contactCode, name, subId });
    return new Response(JSON.stringify({ success: true, contact }), { headers: cors });
  }

  // DELETE /api/subserver/contacts/:code
  const delMatch = pathname.match(/^\/api\/subserver\/contacts\/([^/]+)$/);
  if (delMatch && request.method === 'DELETE') {
    const code = delMatch[1];
    await env.DB.prepare(`UPDATE contacts_${subId} SET is_active = 0 WHERE contact_code = ?`).bind(code).run();
    // Hapus dari KV session
    const sessionList = await env.KV.list({ prefix: 'session:' });
    for (const k of sessionList.keys) {
      const raw = await env.KV.get(k.name);
      const s = raw ? JSON.parse(raw) : null;
      if (s?.contactCode === code) await env.KV.delete(k.name);
    }
    await auditLog(env.DB, 'contact_deleted', { code, subId });
    return new Response(JSON.stringify({ success: true }), { headers: cors });
  }

  // POST /api/subserver/contacts/:code/reset
  const resetMatch = pathname.match(/^\/api\/subserver\/contacts\/([^/]+)\/reset$/);
  if (resetMatch && request.method === 'POST') {
    const oldCode = resetMatch[1];
    const parent = generateParent();
    const seq = await getNextContactSeq(env.KV, ownerCode);
    const newCode = `USR-${parent}-${String(seq).padStart(3, '0')}`;

    const contact = await env.DB.prepare(`SELECT * FROM contacts_${subId} WHERE contact_code = ?`).bind(oldCode).first();
    if (!contact) return new Response(JSON.stringify({ success: false, error: 'Kontak tidak ditemukan' }), { status: 404, headers: cors });

    // Hapus record lama, buat yang baru
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO contacts_${subId} (contact_code, name, added_by) VALUES (?, ?, 'UTAMA')`).bind(newCode, contact.name),
      env.DB.prepare(`UPDATE contacts_${subId} SET is_active = 0 WHERE contact_code = ?`).bind(oldCode),
    ]);
    await setContact(env.KV, subId, ownerCode, newCode, { name: contact.name, active: true, joinedAt: Date.now() });

    // Hapus session lama
    const sessionList = await env.KV.list({ prefix: 'session:' });
    for (const k of sessionList.keys) {
      const raw = await env.KV.get(k.name);
      const s = raw ? JSON.parse(raw) : null;
      if (s?.contactCode === oldCode) await env.KV.delete(k.name);
    }

    await auditLog(env.DB, 'contact_reset', { oldCode, newCode, subId });
    return new Response(JSON.stringify({ success: true, newCode }), { headers: cors });
  }

  // GET /api/subserver/info
  if (pathname === '/api/subserver/info' && request.method === 'GET') {
    const ss = await getSubServer(env.KV, ownerCode);
    return new Response(JSON.stringify({ success: true, subServer: ss }), { headers: cors });
  }

  return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404, headers: cors });
}
