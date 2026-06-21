export async function handleCleanup(env) {
  console.log('Cron cleanup started at', new Date().toISOString());

  // Ambil semua subserver IDs
  const ssList = await env.KV.list({ prefix: 'subid:' });

  for (const k of ssList.keys) {
    const ownerCode = await env.KV.get(k.name);
    if (!ownerCode) continue;
    const subId = k.name.replace('subid:', '');

    try {
      // Hapus pesan teks > 48 jam
      await env.DB.prepare(
        `DELETE FROM group_messages_${subId} WHERE content_type = 'text' AND created_at < datetime('now', '-48 hours')`
      ).run();
      await env.DB.prepare(
        `DELETE FROM personal_messages_${subId} WHERE content_type = 'text' AND created_at < datetime('now', '-48 hours')`
      ).run();

      // Hapus media > 24 jam (ambil key R2 dulu)
      const expiredMedia = await env.DB.prepare(
        `SELECT content FROM group_messages_${subId} WHERE content_type IN ('image','voice','video') AND created_at < datetime('now', '-24 hours')`
      ).all();
      const expiredMediaP = await env.DB.prepare(
        `SELECT content FROM personal_messages_${subId} WHERE content_type IN ('image','voice','video') AND created_at < datetime('now', '-24 hours')`
      ).all();

      const allExpired = [...(expiredMedia.results || []), ...(expiredMediaP.results || [])];
      for (const row of allExpired) {
        if (row.content && row.content.includes('/media/')) {
          const urlParts = row.content.split('/media/');
          if (urlParts[1]) {
            try { await env.MEDIA_BUCKET.delete(`media/${urlParts[1]}`); } catch {}
          }
        }
      }

      // Hapus record media dari DB
      await env.DB.prepare(
        `DELETE FROM group_messages_${subId} WHERE content_type IN ('image','voice','video') AND created_at < datetime('now', '-24 hours')`
      ).run();
      await env.DB.prepare(
        `DELETE FROM personal_messages_${subId} WHERE content_type IN ('image','voice','video') AND created_at < datetime('now', '-24 hours')`
      ).run();

      // Hapus kontak soft-deleted > 7 hari
      const deletedContacts = await env.DB.prepare(
        `SELECT contact_code, avatar_url FROM contacts_${subId} WHERE is_active = 0 AND created_at < datetime('now', '-7 days')`
      ).all();
      for (const c of (deletedContacts.results || [])) {
        if (c.avatar_url) {
          try { await env.MEDIA_BUCKET.delete(`avatars/${subId}/${c.contact_code}.webp`); } catch {}
        }
        await env.DB.prepare(`DELETE FROM contacts_${subId} WHERE contact_code = ?`).bind(c.contact_code).run();
      }

      console.log(`Cleanup done for subId: ${subId}`);
    } catch (e) {
      console.error(`Cleanup error for ${subId}:`, e.message);
    }
  }

  console.log('Cron cleanup finished');
}
