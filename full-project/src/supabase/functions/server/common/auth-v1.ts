// Middleware xác thực + RBAC cho route /api/v1/*
// Token v1 payload: { uid: number, username: string, email: string, roles: string[] }
import { verifyJWT } from './jwt.ts';
import { fail } from './response.ts';

export type V1User = {
  uid: number;
  username: string;
  email: string;
  roles: string[]; // ['ADMIN', 'CUSTOMER', 'OPERATOR']
};

export async function authV1(c: any, next: any) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json(fail('Thiếu token xác thực', 'UNAUTHORIZED'), 401);
  const payload = await verifyJWT(token);
  if (!payload || typeof payload.uid !== 'number') {
    return c.json(fail('Token không hợp lệ hoặc hết hạn', 'UNAUTHORIZED'), 401);
  }
  c.set('user', payload as V1User);
  await next();
}

export function requireRoles(...roles: string[]) {
  return async (c: any, next: any) => {
    const u = c.get('user') as V1User | undefined;
    if (!u) return c.json(fail('Chưa xác thực', 'UNAUTHORIZED'), 401);
    const has = u.roles?.some(r => roles.includes(r.toUpperCase()));
    if (!has) return c.json(fail('Không đủ quyền truy cập', 'FORBIDDEN'), 403);
    await next();
  };
}
