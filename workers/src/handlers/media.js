export async function handleMedia(request, env, pathname, session) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (!session) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: cors });

  const { subServerId: subId, contactCode } = session;

  // POST /api/media/upload — minta URL upload R2
  if (pathname === '/api/media/upload' && request.method === 'POST') {
    const { type, chatType } = await request.json();
    const uuid = crypto.randomUUID();
    const ext = type === 'image' ? 'webp' : type === 'voice' ? 'opus' : 'mp4';
    const folder = type === 'image' ? 'images' : type === 'voice' ? 'voice' : 'video';
    const key = `media/${subId}/${folder}/${uuid}.${ext}`;
    const contentType = type === 'image' ? 'image/webp' : type === 'voice' ? 'audio/opus' : 'video/mp4';

    try {
      const uploadUrl = await env.MEDIA_BUCKET.createMultipartUpload
        ? null // signed URL approach
        : null;
      // Karena R2 presigned URL butuh R2 SDK khusus, kita pakai direct upload via worker
      const fileUrl = `https://${env.R2_PUBLIC_URL}/${key}`;
      return new Response(JSON.stringify({ success: true, key, fileUrl, contentType }), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'R2 tidak tersedia: ' + e.message }), { status: 500, headers: cors });
    }
  }

  // PUT /api/media/upload/:key — upload file langsung ke R2 via worker
  if (pathname.startsWith('/api/media/upload/') && request.method === 'PUT') {
    const key = pathname.replace('/api/media/upload/', '');
    if (!key.startsWith(`media/${subId}/`) && !key.startsWith(`avatars/${subId}/`)) {
      return new Response(JSON.stringify({ success: false, error: 'Akses ditolak' }), { status: 403, headers: cors });
    }
    const body = await request.arrayBuffer();
    const ct = request.headers.get('Content-Type') || 'application/octet-stream';
    await env.MEDIA_BUCKET.put(key, body, { httpMetadata: { contentType: ct } });
    return new Response(JSON.stringify({ success: true }), { headers: cors });
  }

  // POST /api/media/avatar
  if (pathname === '/api/media/avatar' && request.method === 'POST') {
    const key = `avatars/${subId}/${contactCode}.webp`;
    const body = await request.arrayBuffer();
    await env.MEDIA_BUCKET.put(key, body, { httpMetadata: { contentType: 'image/webp' } });
    const avatarUrl = `https://${env.R2_PUBLIC_URL}/${key}`;
    try {
      await env.DB.prepare(`UPDATE contacts_${subId} SET avatar_url = ? WHERE contact_code = ?`).bind(avatarUrl, contactCode).run();
    } catch {}
    return new Response(JSON.stringify({ success: true, avatarUrl }), { headers: cors });
  }

  return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404, headers: cors });
}
