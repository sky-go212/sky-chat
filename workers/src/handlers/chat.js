export async function handleChat(request, env, pathname, session) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (!session) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: cors });

  const { subServerId: subId, contactCode } = session;

  // GET /api/chat/group/history
  if (pathname === '/api/chat/group/history' && request.method === 'GET') {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const before = url.searchParams.get('before');
    let query = `SELECT * FROM group_messages_${subId} WHERE deleted = 0`;
    if (before) query += ` AND id < ${parseInt(before)}`;
    query += ` ORDER BY created_at DESC LIMIT ${limit}`;
    const result = await env.DB.prepare(query).all();
    return new Response(JSON.stringify({ success: true, messages: (result.results || []).reverse() }), { headers: cors });
  }

  // GET /api/chat/personal/history
  if (pathname === '/api/chat/personal/history' && request.method === 'GET') {
    const url = new URL(request.url);
    const withCode = url.searchParams.get('with');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    if (!withCode) return new Response(JSON.stringify({ success: false, error: 'Parameter with diperlukan' }), { status: 400, headers: cors });
    const result = await env.DB.prepare(
      `SELECT * FROM personal_messages_${subId} WHERE deleted = 0 AND ((sender_code = ? AND receiver_code = ?) OR (sender_code = ? AND receiver_code = ?)) ORDER BY created_at DESC LIMIT ?`
    ).bind(contactCode, withCode, withCode, contactCode, limit).all();
    return new Response(JSON.stringify({ success: true, messages: (result.results || []).reverse() }), { headers: cors });
  }

  // GET /api/chat/personal/rooms
  if (pathname === '/api/chat/personal/rooms' && request.method === 'GET') {
    const result = await env.DB.prepare(
      `SELECT * FROM personal_chat_rooms_${subId} WHERE participant_a = ? OR participant_b = ? ORDER BY last_message_at DESC`
    ).bind(contactCode, contactCode).all();
    return new Response(JSON.stringify({ success: true, rooms: result.results || [] }), { headers: cors });
  }

  // POST /api/chat/personal/rooms — buat room baru
  if (pathname === '/api/chat/personal/rooms' && request.method === 'POST') {
    const { partnerCode } = await request.json();
    const a = [contactCode, partnerCode].sort()[0];
    const b = [contactCode, partnerCode].sort()[1];
    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO personal_chat_rooms_${subId} (participant_a, participant_b) VALUES (?, ?)`
      ).bind(a, b).run();
    } catch {}
    const room = await env.DB.prepare(
      `SELECT * FROM personal_chat_rooms_${subId} WHERE participant_a = ? AND participant_b = ?`
    ).bind(a, b).first();
    return new Response(JSON.stringify({ success: true, room }), { headers: cors });
  }

  // POST /api/chat/read
  if (pathname === '/api/chat/read' && request.method === 'POST') {
    const { messageId } = await request.json();
    await env.DB.prepare(`UPDATE personal_messages_${subId} SET status = 'read' WHERE id = ? AND receiver_code = ?`).bind(messageId, contactCode).run();
    return new Response(JSON.stringify({ success: true }), { headers: cors });
  }

  // POST /api/chat/reaction
  if (pathname === '/api/chat/reaction' && request.method === 'POST') {
    const { messageId, emoji, chatType } = await request.json();
    const table = chatType === 'group' ? `group_messages_${subId}` : `personal_messages_${subId}`;
    await env.DB.prepare(`UPDATE ${table} SET reaction = ? WHERE id = ?`).bind(emoji, messageId).run();
    return new Response(JSON.stringify({ success: true }), { headers: cors });
  }

  // POST /api/chat/delete
  if (pathname === '/api/chat/delete' && request.method === 'POST') {
    const { messageId, scope, chatType } = await request.json();
    if (scope === 'all') {
      const table = chatType === 'group' ? `group_messages_${subId}` : `personal_messages_${subId}`;
      await env.DB.prepare(`UPDATE ${table} SET deleted = 1 WHERE id = ? AND sender_code = ?`).bind(messageId, contactCode).run();
    }
    return new Response(JSON.stringify({ success: true }), { headers: cors });
  }

  return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404, headers: cors });
}
