import { getSubServer, setSubServer } from '../utils/kv.js';
import { auditLog } from '../utils/audit.js';

function generateParent() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

async function getNextSubId(kv) {
  const raw = await kv.get('admin:subserver_counter');
  const n = raw ? parseInt(raw) + 1 : 1;
  await kv.put('admin:subserver_counter', String(n));
  return `SS${String(n).padStart(4, '0')}`;
}

export async function handleAdmin(request, env, pathname, session) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (!session || session.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: cors });
  }

  // POST /api/admin/subserver — buat SubServer baru
  if (pathname === '/api/admin/subserver' && request.method === 'POST') {
    const { name, maxContacts = 50, expiryDays = 365 } = await request.json();
    if (!name?.trim()) return new Response(JSON.stringify({ success: false, error: 'Nama wajib diisi' }), { status: 400, headers: cors });

    const parent = generateParent();
    const subId = await getNextSubId(env.KV);
    const ownerCode = `UTAMA-${parent}-001`;
    const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString();

    const ssData = { name: name.trim(), subId, ownerCode, maxContacts, expiresAt, active: true, contactCount: 0, createdAt: new Date().toISOString() };
    await setSubServer(env.KV, ownerCode, ssData);
    await env.KV.put(`subid:${subId}`, ownerCode);

    // Buat tabel D1 untuk SubServer baru
    try {
      await env.DB.batch([
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS contacts_${subId} (contact_code TEXT PRIMARY KEY, name TEXT NOT NULL, avatar_url TEXT, added_by TEXT DEFAULT 'UTAMA', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_active INTEGER DEFAULT 1)`),
        env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_contacts_${subId}_active ON contacts_${subId}(is_active, created_at)`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS group_messages_${subId} (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_code TEXT NOT NULL, content_type TEXT NOT NULL, content TEXT NOT NULL, caption TEXT, file_size INTEGER, duration TEXT, reaction TEXT, reply_to INTEGER, deleted INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`),
        env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_gm_${subId}_time ON group_messages_${subId}(created_at)`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS personal_messages_${subId} (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_code TEXT NOT NULL, receiver_code TEXT NOT NULL, content_type TEXT NOT NULL, content TEXT NOT NULL, caption TEXT, file_size INTEGER, duration TEXT, reaction TEXT, reply_to INTEGER, status TEXT DEFAULT 'sent', deleted INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`),
        env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_pm_${subId}_recv ON personal_messages_${subId}(receiver_code, created_at)`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS personal_chat_rooms_${subId} (id INTEGER PRIMARY KEY AUTOINCREMENT, participant_a TEXT NOT NULL, participant_b TEXT NOT NULL, last_message_at DATETIME, last_message_preview TEXT, unread_a INTEGER DEFAULT 0, unread_b INTEGER DEFAULT 0, UNIQUE(participant_a, participant_b))`),
      ]);
    } catch (e) { console.error('DB init error:', e.message); }

    await auditLog(env.DB, 'subserver_created', { name, ownerCode, subId });
    return new Response(JSON.stringify({ success: true, subServer: ssData }), { headers: cors });
  }

  // GET /api/admin/subserver — list semua
  if (pathname === '/api/admin/subserver' && request.method === 'GET') {
    const list = await env.KV.list({ prefix: 'subserver:UTAMA-' });
    const subServers = await Promise.all(list.keys.map(async k => {
      const raw = await env.KV.get(k.name);
      return raw ? JSON.parse(raw) : null;
    }));
    return new Response(JSON.stringify({ success: true, subServers: subServers.filter(Boolean) }), { headers: cors });
  }

  // PUT /api/admin/subserver/:kode/status
  const statusMatch = pathname.match(/^\/api\/admin\/subserver\/([^/]+)\/status$/);
  if (statusMatch && request.method === 'PUT') {
    const kode = statusMatch[1];
    const { active } = await request.json();
    const ss = await getSubServer(env.KV, kode);
    if (!ss) return new Response(JSON.stringify({ success: false, error: 'Tidak ditemukan' }), { status: 404, headers: cors });
    ss.active = active;
    await setSubServer(env.KV, kode, ss);
    return new Response(JSON.stringify({ success: true }), { headers: cors });
  }

  // GET /api/admin/stats
  if (pathname === '/api/admin/stats' && request.method === 'GET') {
    const list = await env.KV.list({ prefix: 'subserver:UTAMA-' });
    let totalSubServers = list.keys.length, activeSubServers = 0, inactiveSubServers = 0, totalContacts = 0;
    for (const k of list.keys) {
      const raw = await env.KV.get(k.name);
      const ss = raw ? JSON.parse(raw) : null;
      if (!ss) continue;
      if (ss.active) activeSubServers++; else inactiveSubServers++;
      totalContacts += ss.contactCount || 0;
    }
    return new Response(JSON.stringify({ success: true, stats: { totalSubServers, activeSubServers, inactiveSubServers, totalContacts } }), { headers: cors });
  }

  return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404, headers: cors });
}
