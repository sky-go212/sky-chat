export async function getSubServer(kv, ownerCode) {
  const raw = await kv.get(`subserver:${ownerCode}`);
  return raw ? JSON.parse(raw) : null;
}

export async function setSubServer(kv, ownerCode, data, ttl = null) {
  const opts = ttl ? { expirationTtl: ttl } : {};
  await kv.put(`subserver:${ownerCode}`, JSON.stringify(data), opts);
}

export async function getContact(kv, subId, ownerCode, contactCode) {
  const raw = await kv.get(`sub:${subId}:contact:${ownerCode}:${contactCode}`);
  return raw ? JSON.parse(raw) : null;
}

export async function setContact(kv, subId, ownerCode, contactCode, data) {
  await kv.put(`sub:${subId}:contact:${ownerCode}:${contactCode}`, JSON.stringify(data));
}

export async function getSession(kv, token) {
  const raw = await kv.get(`session:${token}`);
  return raw ? JSON.parse(raw) : null;
}

export async function setSession(kv, token, data) {
  await kv.put(`session:${token}`, JSON.stringify(data), { expirationTtl: 86400 });
}

export async function deleteSession(kv, token) {
  await kv.delete(`session:${token}`);
}
