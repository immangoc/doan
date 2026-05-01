// Use the same token key as do-an-full's WarehouseAuthContext
const TOKEN_KEY = 'ht_token';
const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const BASE_URL = runtimeEnv?.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

function readJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = readJwtPayload(token);
  const exp = typeof payload?.exp === 'number' ? payload.exp : Number(payload?.exp);
  return !Number.isFinite(exp) || exp * 1000 <= Date.now();
}

// ── Token helpers ──────────────────────────────────────────────────────────

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (isTokenExpired(token)) {
    clearToken();
    return null;
  }
  return token;
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── JWT decode (no library needed) ─────────────────────────────────────────

export interface JwtUser {
  username: string;
  role: string;
}

export function decodeJwtUser(token: string): JwtUser | null {
  try {
    if (isTokenExpired(token)) return null;
    // base64url → base64
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    return {
      username: payload.sub || payload.username || 'User',
      role: payload.role || (Array.isArray(payload.roles) ? payload.roles[0] : '') || 'OPERATOR',
    };
  } catch {
    return null;
  }
}

// ── Redirect ───────────────────────────────────────────────────────────────

export function redirectToUnauthorized(): void {
  clearToken();
  localStorage.removeItem('ht_user');
  window.location.replace('/warehouse/login');
}

// ── API fetch wrapper ──────────────────────────────────────────────────────

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) {
    redirectToUnauthorized();
  }
  return res;
}
