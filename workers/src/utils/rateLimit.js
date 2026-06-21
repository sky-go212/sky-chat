// Rate limit pakai KV (per IP). Untuk brute force pakai DO di masa depan.
export async function checkRateLimit(kv, key, maxAttempts, windowSeconds) {
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw) : 0;
  if (count >= maxAttempts) return false;
  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return true;
}
