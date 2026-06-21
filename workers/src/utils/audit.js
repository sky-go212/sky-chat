export async function auditLog(db, event, data = {}) {
  try {
    await db.prepare('INSERT INTO audit_log (event, data, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .bind(event, JSON.stringify(data)).run();
  } catch {}
}
