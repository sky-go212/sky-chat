const ALGO = { name: 'HMAC', hash: 'SHA-256' };

async function getKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), ALGO, false, ['sign', 'verify']);
}

function b64url(str) { return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
function fromb64url(str) { return atob(str.replace(/-/g, '+').replace(/_/g, '/')); }

export async function signJWT(payload, secret, expiresInSeconds = 86400) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign(ALGO, key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`;
}

export async function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(ALGO, key, Uint8Array.from(fromb64url(sig), c => c.charCodeAt(0)), new TextEncoder().encode(`${header}.${body}`));
    if (!valid) return null;
    const payload = JSON.parse(fromb64url(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
