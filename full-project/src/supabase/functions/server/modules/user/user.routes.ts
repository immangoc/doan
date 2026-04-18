// User module — port từ warehouse-service (UserController + RoleController + PermissionController + SystemLogController)
// Mount dưới /api/v1
//   /users/me                          GET, PUT
//   /users/me/profile                  PUT
//   /users/me/addresses                GET, POST
//   /users/me/addresses/:addressId     PUT, DELETE
//   /users/me/activity-log             GET
//   /admin/users                       GET, POST
//   /admin/users/:userId               GET, PUT
//   /admin/users/:userId/status        PUT
//   /admin/users/:userId/roles/:roleId PUT
//   /admin/roles                       GET, POST
//   /admin/roles/:roleId               GET, PUT, DELETE
//   /admin/permissions                 GET
//   /admin/permissions/:permissionId   GET
//   /admin/system-logs                 GET
//   /admin/system-logs/user/:userId    GET
import { Hono } from 'npm:hono';
import * as bcrypt from 'npm:bcryptjs';
import { sql, tx } from '../../db.ts';
import { ok, fail, page } from '../../common/response.ts';
import { authV1, requireRoles } from '../../common/auth-v1.ts';

const users = new Hono();
const admin = new Hono();

// ============================================================
// /users/me — current user
// ============================================================
async function loadUserDetail(uid: number) {
  const db = sql();
  const u = await db`
    SELECT u.user_id, u.username, u.full_name, u.email, u.phone, u.status, u.created_at,
           p.profile_id, p.gender, p.date_of_birth, p.national_id
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.user_id
    WHERE u.user_id = ${uid} LIMIT 1
  `;
  if (u.length === 0) return null;
  const roles = await db`
    SELECT r.role_id, r.role_name FROM user_roles ur
    JOIN roles r ON r.role_id = ur.role_id WHERE ur.user_id = ${uid}
  `;
  const r = u[0];
  return {
    userId: r.user_id, username: r.username, fullName: r.full_name,
    email: r.email, phone: r.phone, status: r.status, createdAt: r.created_at,
    profile: r.profile_id ? { gender: r.gender, dateOfBirth: r.date_of_birth, nationalId: r.national_id } : null,
    roles: roles.map((x: any) => ({ roleId: x.role_id, roleName: x.role_name })),
  };
}

users.get('/me', authV1, async (c) => {
  const u = c.get('user') as any;
  const data = await loadUserDetail(u.uid);
  if (!data) return c.json(fail('Không tìm thấy người dùng', 'USER_NOT_FOUND'), 404);
  return c.json(ok(data));
});

users.put('/me', authV1, async (c) => {
  const u = c.get('user') as any;
  const body = await c.req.json().catch(() => ({}));
  const db = sql();
  await db`
    UPDATE users SET
      full_name = COALESCE(${body.fullName ?? null}, full_name),
      email     = COALESCE(${body.email ? String(body.email).toLowerCase() : null}, email),
      phone     = COALESCE(${body.phone ?? null}, phone)
    WHERE user_id = ${u.uid}
  `;
  return c.json(ok(await loadUserDetail(u.uid), 'Đã cập nhật'));
});

users.put('/me/profile', authV1, async (c) => {
  const u = c.get('user') as any;
  const body = await c.req.json().catch(() => ({}));
  const db = sql();
  await db`
    INSERT INTO user_profiles (user_id, gender, date_of_birth, national_id)
    VALUES (${u.uid}, ${body.gender ?? null}, ${body.dateOfBirth ?? null}, ${body.nationalId ?? null})
    ON CONFLICT (user_id) DO UPDATE SET
      gender = EXCLUDED.gender,
      date_of_birth = EXCLUDED.date_of_birth,
      national_id = EXCLUDED.national_id
  `;
  return c.json(ok(await loadUserDetail(u.uid), 'Đã cập nhật hồ sơ'));
});

// ============================================================
// /users/me/addresses
// ============================================================
users.get('/me/addresses', authV1, async (c) => {
  const u = c.get('user') as any;
  const db = sql();
  const rows = await db`
    SELECT address_id, address, ward, district, city, is_default
    FROM user_addresses WHERE user_id = ${u.uid} ORDER BY is_default DESC, address_id
  `;
  return c.json(ok(rows.map((r: any) => ({
    addressId: r.address_id, address: r.address, ward: r.ward,
    district: r.district, city: r.city, isDefault: r.is_default,
  }))));
});

users.post('/me/addresses', authV1, async (c) => {
  const u = c.get('user') as any;
  const b = await c.req.json().catch(() => ({}));
  const db = sql();
  const isDef = !!b.isDefault;
  if (isDef) await db`UPDATE user_addresses SET is_default = FALSE WHERE user_id = ${u.uid}`;
  const r = await db`
    INSERT INTO user_addresses (user_id, address, ward, district, city, is_default)
    VALUES (${u.uid}, ${b.address ?? null}, ${b.ward ?? null}, ${b.district ?? null}, ${b.city ?? null}, ${isDef})
    RETURNING address_id
  `;
  return c.json(ok({ addressId: r[0].address_id }, 'Đã thêm địa chỉ'), 201);
});

users.put('/me/addresses/:addressId', authV1, async (c) => {
  const u = c.get('user') as any;
  const id = Number(c.req.param('addressId'));
  const b = await c.req.json().catch(() => ({}));
  const db = sql();
  const exists = await db`SELECT 1 FROM user_addresses WHERE address_id = ${id} AND user_id = ${u.uid}`;
  if (exists.length === 0) return c.json(fail('Không tìm thấy địa chỉ', 'NOT_FOUND'), 404);
  if (b.isDefault === true) await db`UPDATE user_addresses SET is_default = FALSE WHERE user_id = ${u.uid}`;
  await db`
    UPDATE user_addresses SET
      address    = COALESCE(${b.address ?? null}, address),
      ward       = COALESCE(${b.ward ?? null}, ward),
      district   = COALESCE(${b.district ?? null}, district),
      city       = COALESCE(${b.city ?? null}, city),
      is_default = COALESCE(${b.isDefault ?? null}, is_default)
    WHERE address_id = ${id}
  `;
  return c.json(ok(null, 'Đã cập nhật địa chỉ'));
});

users.delete('/me/addresses/:addressId', authV1, async (c) => {
  const u = c.get('user') as any;
  const id = Number(c.req.param('addressId'));
  const db = sql();
  const r = await db`DELETE FROM user_addresses WHERE address_id = ${id} AND user_id = ${u.uid} RETURNING address_id`;
  if (r.length === 0) return c.json(fail('Không tìm thấy địa chỉ', 'NOT_FOUND'), 404);
  return c.json(ok(null, 'Đã xoá địa chỉ'));
});

users.get('/me/activity-log', authV1, async (c) => {
  const u = c.get('user') as any;
  const pageNo = Math.max(0, Number(c.req.query('pageNo') ?? 0));
  const pageSize = Math.min(100, Number(c.req.query('pageSize') ?? 20));
  const db = sql();
  const total = (await db`SELECT COUNT(*)::int AS n FROM system_logs WHERE user_id = ${u.uid}`)[0].n;
  const rows = await db`
    SELECT log_id, action, description, created_at FROM system_logs
    WHERE user_id = ${u.uid}
    ORDER BY log_id DESC LIMIT ${pageSize} OFFSET ${pageNo * pageSize}
  `;
  return c.json(ok(page(rows, pageNo, pageSize, total)));
});

// ============================================================
// ADMIN: /admin/users
// ============================================================
const ADMIN_ONLY = requireRoles('ADMIN');

admin.get('/users', authV1, ADMIN_ONLY, async (c) => {
  const db = sql();
  const pageNo = Math.max(0, Number(c.req.query('pageNo') ?? 0));
  const pageSize = Math.min(200, Number(c.req.query('pageSize') ?? 20));
  const q = (c.req.query('q') ?? '').trim();
  const like = `%${q}%`;
  const total = (q
    ? await db`SELECT COUNT(*)::int AS n FROM users WHERE username ILIKE ${like} OR email ILIKE ${like} OR full_name ILIKE ${like}`
    : await db`SELECT COUNT(*)::int AS n FROM users`)[0].n;
  const rows = q
    ? await db`SELECT user_id, username, full_name, email, phone, status, created_at FROM users
               WHERE username ILIKE ${like} OR email ILIKE ${like} OR full_name ILIKE ${like}
               ORDER BY user_id DESC LIMIT ${pageSize} OFFSET ${pageNo * pageSize}`
    : await db`SELECT user_id, username, full_name, email, phone, status, created_at FROM users
               ORDER BY user_id DESC LIMIT ${pageSize} OFFSET ${pageNo * pageSize}`;
  return c.json(ok(page(rows.map((r: any) => ({
    userId: r.user_id, username: r.username, fullName: r.full_name, email: r.email,
    phone: r.phone, status: r.status, createdAt: r.created_at,
  })), pageNo, pageSize, total)));
});

admin.get('/users/:userId', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('userId'));
  const data = await loadUserDetail(id);
  if (!data) return c.json(fail('Không tìm thấy người dùng', 'USER_NOT_FOUND'), 404);
  return c.json(ok(data));
});

admin.post('/users', authV1, ADMIN_ONLY, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const username = (b.username ?? '').trim();
  const email = (b.email ?? '').trim().toLowerCase();
  const password = b.password ?? '';
  const fullName = (b.fullName ?? '').trim();
  const phone = (b.phone ?? '').trim();
  const roleName = (b.roleName ?? 'CUSTOMER').toUpperCase();
  if (!username || !email || password.length < 8 || !fullName) {
    return c.json(fail('Dữ liệu không hợp lệ', 'INVALID_INPUT'), 400);
  }
  const db = sql();
  const dup = await db`SELECT 1 FROM users WHERE email = ${email} OR username = ${username}`;
  if (dup.length > 0) return c.json(fail('Email/username đã tồn tại', 'DUPLICATE'), 409);
  const hash = await bcrypt.hash(password, 10);
  const uid = await tx(async (s: any) => {
    const r = await s`
      INSERT INTO users (username, password, full_name, email, phone, status)
      VALUES (${username}, ${hash}, ${fullName}, ${email}, ${phone || null}, 1)
      RETURNING user_id
    `;
    const newId = r[0].user_id as number;
    await s`INSERT INTO user_roles (user_id, role_id)
            SELECT ${newId}, role_id FROM roles WHERE role_name = ${roleName}`;
    return newId;
  });
  return c.json(ok({ userId: uid }, 'Đã tạo user'), 201);
});

admin.put('/users/:userId', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('userId'));
  const b = await c.req.json().catch(() => ({}));
  const db = sql();
  await db`
    UPDATE users SET
      full_name = COALESCE(${b.fullName ?? null}, full_name),
      email     = COALESCE(${b.email ? String(b.email).toLowerCase() : null}, email),
      phone     = COALESCE(${b.phone ?? null}, phone)
    WHERE user_id = ${id}
  `;
  return c.json(ok(await loadUserDetail(id), 'Đã cập nhật'));
});

admin.put('/users/:userId/status', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('userId'));
  const b = await c.req.json().catch(() => ({}));
  const status = Number(b.status);
  if (![0, 1].includes(status)) return c.json(fail('status phải là 0 hoặc 1', 'INVALID_INPUT'), 400);
  const db = sql();
  const r = await db`UPDATE users SET status = ${status} WHERE user_id = ${id} RETURNING user_id`;
  if (r.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(null, 'Đã cập nhật trạng thái'));
});

admin.put('/users/:userId/roles/:roleId', authV1, ADMIN_ONLY, async (c) => {
  const userId = Number(c.req.param('userId'));
  const roleId = Number(c.req.param('roleId'));
  await tx(async (s: any) => {
    await s`DELETE FROM user_roles WHERE user_id = ${userId}`;
    await s`INSERT INTO user_roles (user_id, role_id) VALUES (${userId}, ${roleId})`;
  });
  return c.json(ok(null, 'Đã gán role'));
});

// ============================================================
// ADMIN: /admin/roles
// ============================================================
admin.get('/roles', authV1, ADMIN_ONLY, async (c) => {
  const db = sql();
  const rows = await db`SELECT role_id, role_name FROM roles ORDER BY role_id`;
  return c.json(ok(rows.map((r: any) => ({ roleId: r.role_id, roleName: r.role_name }))));
});

admin.get('/roles/:roleId', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('roleId'));
  const db = sql();
  const r = await db`SELECT role_id, role_name FROM roles WHERE role_id = ${id}`;
  if (r.length === 0) return c.json(fail('Không tìm thấy role', 'NOT_FOUND'), 404);
  const perms = await db`
    SELECT p.permission_id, p.permission_name, p.description FROM role_permissions rp
    JOIN permissions p ON p.permission_id = rp.permission_id WHERE rp.role_id = ${id}
  `;
  return c.json(ok({ roleId: r[0].role_id, roleName: r[0].role_name, permissions: perms }));
});

admin.post('/roles', authV1, ADMIN_ONLY, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const name = (b.roleName ?? '').trim();
  if (!name) return c.json(fail('roleName bắt buộc', 'INVALID_INPUT'), 400);
  const db = sql();
  const r = await db`INSERT INTO roles (role_name) VALUES (${name}) RETURNING role_id`;
  return c.json(ok({ roleId: r[0].role_id }, 'Đã tạo role'), 201);
});

admin.put('/roles/:roleId', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('roleId'));
  const b = await c.req.json().catch(() => ({}));
  const db = sql();
  if (b.roleName) await db`UPDATE roles SET role_name = ${b.roleName} WHERE role_id = ${id}`;
  if (Array.isArray(b.permissionIds)) {
    await tx(async (s: any) => {
      await s`DELETE FROM role_permissions WHERE role_id = ${id}`;
      for (const pid of b.permissionIds) {
        await s`INSERT INTO role_permissions (role_id, permission_id) VALUES (${id}, ${Number(pid)})`;
      }
    });
  }
  return c.json(ok(null, 'Đã cập nhật'));
});

admin.delete('/roles/:roleId', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('roleId'));
  const db = sql();
  await tx(async (s: any) => {
    await s`DELETE FROM role_permissions WHERE role_id = ${id}`;
    await s`DELETE FROM user_roles WHERE role_id = ${id}`;
    await s`DELETE FROM roles WHERE role_id = ${id}`;
  });
  return c.json(ok(null, 'Đã xoá role'));
});

// ============================================================
// ADMIN: /admin/permissions
// ============================================================
admin.get('/permissions', authV1, ADMIN_ONLY, async (c) => {
  const db = sql();
  const rows = await db`SELECT permission_id, permission_name, description FROM permissions ORDER BY permission_id`;
  return c.json(ok(rows));
});

admin.get('/permissions/:permissionId', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('permissionId'));
  const db = sql();
  const r = await db`SELECT permission_id, permission_name, description FROM permissions WHERE permission_id = ${id}`;
  if (r.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(r[0]));
});

// ============================================================
// ADMIN: /admin/system-logs
// ============================================================
admin.get('/system-logs', authV1, ADMIN_ONLY, async (c) => {
  const pageNo = Math.max(0, Number(c.req.query('pageNo') ?? 0));
  const pageSize = Math.min(200, Number(c.req.query('pageSize') ?? 50));
  const db = sql();
  const total = (await db`SELECT COUNT(*)::int AS n FROM system_logs`)[0].n;
  const rows = await db`
    SELECT log_id, user_id, action, description, created_at FROM system_logs
    ORDER BY log_id DESC LIMIT ${pageSize} OFFSET ${pageNo * pageSize}
  `;
  return c.json(ok(page(rows, pageNo, pageSize, total)));
});

admin.get('/system-logs/user/:userId', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('userId'));
  const db = sql();
  const rows = await db`
    SELECT log_id, user_id, action, description, created_at FROM system_logs
    WHERE user_id = ${id} ORDER BY log_id DESC LIMIT 200
  `;
  return c.json(ok(rows));
});

export { users as userRoutes, admin as userAdminRoutes };
