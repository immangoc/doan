// JWT HS256 — dùng chung cho cả route legacy (/make-server-ce1eb60c/*) và /api/v1/*
const JWT_SECRET = Deno.env.get('JWT_SECRET') ?? 'HungThuyWarehouse2025SuperSecret!@#';

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + (4 - s.length % 4) % 4, '=');
  return new TextDecoder().decode(Uint8Array.from(atob(padded), c => c.charCodeAt(0)));
}

export async function signJWT(payload: Record<string, unknown>, ttlMs = 7 * 86400_000): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + ttlMs }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyJWT(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const data = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigPad = sig.replace(/-/g, '+').replace(/_/g, '/').padEnd(sig.length + (4 - sig.length % 4) % 4, '=');
    const sigBytes = Uint8Array.from(atob(sigPad), c => c.charCodeAt(0));
    if (!await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data))) return null;
    const payload = JSON.parse(b64urlDecode(body));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
