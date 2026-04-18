// Auth module — port từ warehouse-service AuthController + AuthServiceImpl
// Endpoints (mount dưới /api/v1/auth):
//   POST   /register
//   POST   /login
//   POST   /logout
//   POST   /forgot-password
//   POST   /reset-password
//   POST   /send-registration-otp
//   POST   /verify-registration-otp
//   PUT    /change-password    (cần auth)
import { Hono } from 'npm:hono';
import * as bcrypt from 'npm:bcryptjs';
import { sql, tx } from '../../db.ts';
import { ok, fail } from '../../common/response.ts';
import { signJWT } from '../../common/jwt.ts';
import { authV1 } from '../../common/auth-v1.ts';
import { sendOtpEmail, devOtpEcho } from '../../common/mail.ts';

const OTP_TTL_MIN = 5;
const OTP_LEN = 6;
const REG_PREFIX = 'reg:'; // key prefix để phân biệt OTP đăng ký vs reset password

function genOtp(): string {
  let s = '';
  const arr = new Uint8Array(OTP_LEN);
  crypto.getRandomValues(arr);
  for (let i = 0; i < OTP_LEN; i++) s += (arr[i] % 10).toString();
  return s;
}

async function saveOtp(emailKey: string, otp: string) {
  const db = sql();
  await db`
    INSERT INTO email_otp_tokens (email, otp, expires_at, used)
    VALUES (${emailKey}, ${otp}, NOW() + (${OTP_TTL_MIN} || ' minutes')::interval, FALSE)
  `;
}

async function consumeOtp(emailKey: string, otp: string): Promise<boolean> {
  const db = sql();
  const rows = await db`
    SELECT id FROM email_otp_tokens
    WHERE email = ${emailKey} AND otp = ${otp} AND used = FALSE AND expires_at > NOW()
    ORDER BY id DESC LIMIT 1
  `;
  if (rows.length === 0) return false;
  await db`UPDATE email_otp_tokens SET used = TRUE WHERE id = ${rows[0].id}`;
  return true;
}

async function loadUserRoles(uid: number): Promise<string[]> {
  const db = sql();
  const rows = await db`
    SELECT r.role_name FROM user_roles ur
    JOIN roles r ON r.role_id = ur.role_id
    WHERE ur.user_id = ${uid}
  `;
  return rows.map((r: any) => r.role_name);
}

const auth = new Hono();

// POST /register
auth.post('/register', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const username: string = (body.username ?? body.email ?? '').trim();
  const email: string = (body.email ?? '').trim().toLowerCase();
  const password: string = body.password ?? '';
  const fullName: string = (body.fullName ?? body.name ?? '').trim();
  const phone: string = (body.phone ?? '').trim();

  if (!email || !password || password.length < 8) {
    return c.json(fail('Dữ liệu không hợp lệ (email + password ≥ 8 ký tự)', 'INVALID_INPUT'), 400);
  }
  const db = sql();
  const dup = await db`SELECT user_id FROM users WHERE email = ${email} OR username = ${username || email}`;
  if (dup.length > 0) return c.json(fail('Email hoặc tên đăng nhập đã tồn tại', 'DUPLICATE'), 409);

  const hash = await bcrypt.hash(password, 10);
  const uid = await tx(async (s: any) => {
    const inserted = await s`
      INSERT INTO users (username, password, full_name, email, phone, status)
      VALUES (${username || email}, ${hash}, ${fullName || null}, ${email}, ${phone || null}, 1)
      RETURNING user_id
    `;
    const newId = inserted[0].user_id as number;
    // Mặc định gán role CUSTOMER
    await s`
      INSERT INTO user_roles (user_id, role_id)
      SELECT ${newId}, role_id FROM roles WHERE role_name = 'CUSTOMER'
    `;
    return newId;
  });
  return c.json(ok({ userId: uid }, 'Đăng ký thành công, có thể đăng nhập'), 201);
});

// POST /login
auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email: string = (body.email ?? '').trim().toLowerCase();
  const password: string = body.password ?? '';
  if (!email || !password) return c.json(fail('Thiếu email/password', 'INVALID_INPUT'), 400);

  const db = sql();
  const rows = await db`
    SELECT user_id, username, password, email, status
    FROM users WHERE email = ${email} LIMIT 1
  `;
  if (rows.length === 0) return c.json(fail('Email hoặc mật khẩu không đúng', 'INVALID_CREDENTIALS'), 401);
  const u = rows[0];
  if (u.status !== 1) return c.json(fail('Tài khoản đang bị khoá', 'FORBIDDEN'), 403);
  if (!await bcrypt.compare(password, u.password)) {
    return c.json(fail('Email hoặc mật khẩu không đúng', 'INVALID_CREDENTIALS'), 401);
  }
  const roles = await loadUserRoles(u.user_id);
  const ttlMs = 7 * 86400_000;
  const token = await signJWT({ uid: u.user_id, username: u.username, email: u.email, roles }, ttlMs);
  return c.json(ok({
    token, expiresIn: Math.floor(ttlMs / 1000),
    userId: u.user_id, username: u.username, email: u.email,
    role: roles[0] ?? 'CUSTOMER',
    roles,
  }, 'Đăng nhập thành công'));
});

// POST /logout (stateless JWT — chỉ trả OK; FE xoá token)
auth.post('/logout', (c) => c.json(ok(null, 'Đăng xuất thành công')));

// POST /forgot-password
auth.post('/forgot-password', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email: string = (body.email ?? '').trim().toLowerCase();
  if (!email) return c.json(fail('Thiếu email', 'INVALID_INPUT'), 400);
  const db = sql();
  const rows = await db`SELECT user_id FROM users WHERE email = ${email} LIMIT 1`;
  // Im lặng kể cả khi không tồn tại (chống enumerate)
  if (rows.length > 0) {
    const otp = genOtp();
    await saveOtp(email, otp);
    await sendOtpEmail(email, otp, 'reset');
    return c.json(ok({ ...devOtpEcho(otp) }, 'Nếu email tồn tại, OTP đã được gửi'));
  }
  return c.json(ok(null, 'Nếu email tồn tại, OTP đã được gửi'));
});

// POST /reset-password
auth.post('/reset-password', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email: string = (body.email ?? '').trim().toLowerCase();
  const otp: string = (body.otp ?? '').trim();
  const newPassword: string = body.newPassword ?? '';
  if (!email || !otp || newPassword.length < 8) {
    return c.json(fail('Dữ liệu không hợp lệ', 'INVALID_INPUT'), 400);
  }
  const okOtp = await consumeOtp(email, otp);
  if (!okOtp) return c.json(fail('OTP không hợp lệ hoặc hết hạn', 'INVALID_OTP'), 400);
  const hash = await bcrypt.hash(newPassword, 10);
  const db = sql();
  const r = await db`UPDATE users SET password = ${hash} WHERE email = ${email} RETURNING user_id`;
  if (r.length === 0) return c.json(fail('Không tìm thấy người dùng', 'USER_NOT_FOUND'), 404);
  return c.json(ok(null, 'Đổi mật khẩu thành công'));
});

// POST /send-registration-otp
auth.post('/send-registration-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email: string = (body.email ?? '').trim().toLowerCase();
  if (!email) return c.json(fail('Thiếu email', 'INVALID_INPUT'), 400);
  const otp = genOtp();
  await saveOtp(REG_PREFIX + email, otp);
  await sendOtpEmail(email, otp, 'registration');
  return c.json(ok({ ...devOtpEcho(otp) }, 'OTP đã được gửi tới email'));
});

// POST /verify-registration-otp
auth.post('/verify-registration-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email: string = (body.email ?? '').trim().toLowerCase();
  const otp: string = (body.otp ?? '').trim();
  if (!email || !otp) return c.json(fail('Thiếu email/otp', 'INVALID_INPUT'), 400);
  const okOtp = await consumeOtp(REG_PREFIX + email, otp);
  if (!okOtp) return c.json(fail('OTP không hợp lệ hoặc hết hạn', 'INVALID_OTP'), 400);
  return c.json(ok(null, 'OTP hợp lệ'));
});

// PUT /change-password (cần auth)
auth.put('/change-password', authV1, async (c) => {
  const u = c.get('user') as any;
  const body = await c.req.json().catch(() => ({}));
  const oldPassword: string = body.oldPassword ?? '';
  const newPassword: string = body.newPassword ?? '';
  if (!oldPassword || newPassword.length < 8) {
    return c.json(fail('Dữ liệu không hợp lệ', 'INVALID_INPUT'), 400);
  }
  const db = sql();
  const rows = await db`SELECT password FROM users WHERE user_id = ${u.uid} LIMIT 1`;
  if (rows.length === 0) return c.json(fail('Không tìm thấy người dùng', 'USER_NOT_FOUND'), 404);
  if (!await bcrypt.compare(oldPassword, rows[0].password)) {
    return c.json(fail('Mật khẩu hiện tại không đúng', 'INVALID_CREDENTIALS'), 400);
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await db`UPDATE users SET password = ${hash} WHERE user_id = ${u.uid}`;
  return c.json(ok(null, 'Đổi mật khẩu thành công'));
});

export default auth;
