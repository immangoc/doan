import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "npm:bcryptjs";

const app = new Hono();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ============================================================
// BUCKETS
// ============================================================
const BUCKET_USERS      = 'hungthuy-users';
const BUCKET_CONTAINERS = 'hungthuy-containers';
const BUCKET_ACTIVITIES = 'hungthuy-activities';
const BUCKET_NOTIFICATIONS = 'hungthuy-notifications';
const BUCKET_CONTAINER_TYPES = 'hungthuy-container-types';
const BUCKET_CARGO_TYPES = 'hungthuy-cargo-types';
const BUCKET_FEES = 'hungthuy-fees';
const BUCKET_PERMISSIONS = 'hungthuy-permissions';
const BUCKET_SCHEDULES = 'hungthuy-schedules';
const BUCKET_SHIPPING_COMPANIES = 'hungthuy-shipping-companies';

const JWT_SECRET = 'HungThuyWarehouse2025SuperSecret!@#';

// ============================================================
// STORAGE HELPERS
// ============================================================
async function sBucketInit() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const names = (buckets || []).map((b: any) => b.name);
  for (const name of [
    BUCKET_USERS,
    BUCKET_CONTAINERS,
    BUCKET_ACTIVITIES,
    BUCKET_NOTIFICATIONS,
    BUCKET_CONTAINER_TYPES,
    BUCKET_CARGO_TYPES,
    BUCKET_FEES,
    BUCKET_PERMISSIONS,
    BUCKET_SCHEDULES,
    BUCKET_SHIPPING_COMPANIES,
  ]) {
    if (!names.includes(name)) {
      await supabase.storage.createBucket(name, { public: false });
    }
  }
}

async function sGet(bucket: string, key: string): Promise<any | null> {
  const { data, error } = await supabase.storage.from(bucket).download(`${key}.json`);
  if (error || !data) return null;
  return JSON.parse(await data.text());
}

async function sSet(bucket: string, key: string, value: any): Promise<void> {
  const blob = new Blob([JSON.stringify(value)], { type: 'application/json' });
  const { error } = await supabase.storage.from(bucket).upload(`${key}.json`, blob, { upsert: true });
  if (error) throw new Error(`sSet[${key}]: ${error.message}`);
}

async function sDel(bucket: string, key: string): Promise<void> {
  await supabase.storage.from(bucket).remove([`${key}.json`]);
}

async function sList(bucket: string): Promise<any[]> {
  const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1000 });
  if (error || !data) return [];
  const results: any[] = [];
  for (const file of data) {
    if (!file.name.endsWith('.json')) continue;
    const { data: blob } = await supabase.storage.from(bucket).download(file.name);
    if (!blob) continue;
    try { results.push(JSON.parse(await blob.text())); } catch (_) { /**/ }
  }
  return results;
}

// ============================================================
// SIMPLE JWT (HMAC-SHA256) — dùng TextEncoder để hỗ trợ Unicode
// ============================================================
function b64url(data: Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = data;
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + (4 - s.length % 4) % 4, '=');
  const binary = atob(padded);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function signJWT(payload: object): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = b64url(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 86400000 * 7 }));
  const data   = `${header}.${body}`;
  const key    = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig    = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

async function verifyJWT(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const data = `${header}.${body}`;
    const key  = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigPadded  = sig.replace(/-/g, '+').replace(/_/g, '/').padEnd(sig.length + (4 - sig.length % 4) % 4, '=');
    const sigBytes   = Uint8Array.from(atob(sigPadded), c => c.charCodeAt(0));
    const valid      = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload    = JSON.parse(b64urlDecode(body));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================
// MIDDLEWARE XÁC THỰC
// ============================================================
async function authMiddleware(c: any, next: any) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Thiếu token xác thực' }, 401);
  const payload = await verifyJWT(token);
  if (!payload) return c.json({ error: 'Token không hợp lệ hoặc hết hạn' }, 401);
  c.set('authUser', payload);
  await next();
}

function requireRole(...roles: string[]) {
  return async (c: any, next: any) => {
    const u = c.get('authUser');
    if (!roles.includes(u?.role)) return c.json({ error: 'Không đủ quyền truy cập' }, 403);
    await next();
  };
}

// ============================================================
// PRE-SEED DEMO ACCOUNTS (chạy khi server khởi động)
// ============================================================
const DEMO_USERS = [
  { id: 'u-admin',    email: 'admin@hungthuy.com',    password: 'Hungthuy@2025', name: 'Nguyễn Hùng Thủy', role: 'admin',    company: 'Hùng Thủy Transport', phone: '0901234567' },
  { id: 'u-planner',  email: 'planner@hungthuy.com',  password: 'Hungthuy@2025', name: 'Trần Minh Phúc',   role: 'planner',  company: 'Hùng Thủy Transport', phone: '0902345678' },
  { id: 'u-operator', email: 'operator@hungthuy.com', password: 'Hungthuy@2025', name: 'Lê Văn Hùng',      role: 'operator', company: 'Hùng Thủy Transport', phone: '0903456789' },
  { id: 'u-customer', email: 'customer@hungthuy.com', password: 'Hungthuy@2025', name: 'Phạm Thị Lan',     role: 'customer', company: 'Công ty XNK ABC',     phone: '0904567890' },
];

const DEMO_CONTAINERS = [
  { container_number: 'TEMU1234567', container_type: '40ft',    cargo_type: 'Điện tử',              weight_kg: 24000, zone: 'A', block: '01', slot: '015', status: 'in_storage', eta: '2026-03-01', etd: '2026-03-15', customer_name: 'Công ty XNK Việt Nam',     customer_id: 'u-customer' },
  { container_number: 'CSNU9876543', container_type: '20ft',    cargo_type: 'Hàng dệt may',         weight_kg: 18000, zone: 'A', block: '02', slot: '008', status: 'in_storage', eta: '2026-03-02', etd: '2026-03-20', customer_name: 'Tập đoàn Dệt May ABC',     customer_id: 'u-customer' },
  { container_number: 'HLXU2468135', container_type: '40ft-hc', cargo_type: 'Thực phẩm đông lạnh', weight_kg: 26000, zone: 'B', block: '01', slot: '003', status: 'pending',    eta: '2026-03-05', etd: '2026-03-25', customer_name: 'Cty Thực phẩm XYZ',        customer_id: 'u-customer' },
  { container_number: 'MSCU5671234', container_type: '20ft',    cargo_type: 'Nông sản',             weight_kg: 15000, zone: 'B', block: '03', slot: '012', status: 'exported',   eta: '2026-02-20', etd: '2026-03-01', customer_name: 'HTX Nông sản Miền Nam',    customer_id: '' },
  { container_number: 'CMAU7891011', container_type: '40ft',    cargo_type: 'Hóa chất công nghiệp',weight_kg: 22000, zone: 'C', block: '01', slot: '007', status: 'in_storage', eta: '2026-03-03', etd: '2026-03-18', customer_name: 'Cty Hóa chất Phương Đông', customer_id: '' },
  { container_number: 'OOLU3344556', container_type: '20ft',    cargo_type: 'Máy móc thiết bị',     weight_kg: 19000, zone: 'C', block: '02', slot: '004', status: 'pending',    eta: '2026-03-06', etd: '2026-03-28', customer_name: 'Cty Cơ khí Thiên Long',    customer_id: '' },
  { container_number: 'EVERGREEN77', container_type: '40ft-hc', cargo_type: 'Hàng lạnh',           weight_kg: 27000, zone: 'D', block: '01', slot: '001', status: 'in_storage', eta: '2026-03-04', etd: '2026-03-22', customer_name: 'Siêu thị Vinmart',         customer_id: '' },
];

async function autoSeedOnStartup() {
  try {
    await sBucketInit();

    // ── Seed users ────────────────────────────────────────────────
    for (const u of DEMO_USERS) {
      const existing = await sGet(BUCKET_USERS, u.id);
      if (!existing) {
        const hash = await bcrypt.hash(u.password, 10);
        await sSet(BUCKET_USERS, u.id, {
          id: u.id, email: u.email, name: u.name, role: u.role,
          company: u.company, phone: u.phone,
          address: '',
          preferences: {
            language: 'vi',
            theme: 'light',
            notifications: {
              new_orders: true,
              low_stock: true,
              weekly_report: true,
              system_alerts: true,
            }
          },
          password_hash: hash,
          created_at: new Date().toISOString(),
          status: 'active',
        });
        console.log(`✅ Seeded user: ${u.email}`);
      }
    }

    // ── Seed containers ───────────────────────────────────────────
    const existing = await sList(BUCKET_CONTAINERS);
    if (existing.length === 0) {
      const now = new Date();
      const seedCount = 36; // đủ để demo biểu đồ theo tháng/ngày

      for (let i = 0; i < seedCount; i++) {
        const template = DEMO_CONTAINERS[i % DEMO_CONTAINERS.length];
        const id = crypto.randomUUID();

        // Trải dữ liệu lùi về quá khứ để các bộ lọc theo ngày/tháng có số liệu.
        const createdAt = new Date(now.getTime() - (seedCount - 1 - i) * 24 * 60 * 60 * 1000 * 14);
        const exportAt = template.status === 'exported'
          ? new Date(createdAt.getTime() + (6 + (i % 7)) * 24 * 60 * 60 * 1000)
          : undefined;

        const broken = template.status === 'exported' ? i % 6 === 0 || i % 10 === 0 : false;
        const export_delay_days = template.status === 'exported' ? (i % 7) : 0;

        const customer_id = template.customer_id && template.customer_id.trim() ? template.customer_id : 'u-customer';
        const container_number = `${template.container_number}-${i + 1}`;

        await sSet(BUCKET_CONTAINERS, id, {
          id,
          ...template,
          container_number,
          customer_id,
          notes: '',
          position: `${template.zone}-${template.block}-${template.slot}`,
          created_by: 'u-admin',
          created_by_name: 'Nguyễn Hùng Thủy',
          created_at: createdAt.toISOString(),
          updated_at: createdAt.toISOString(),
          ...(exportAt && template.status === 'exported' ? { export_date: exportAt.toISOString() } : {}),
          broken,
          broken_type: broken ? template.cargo_type : '',
          export_delay_days,
        });
      }

      console.log(`✅ Seeded ${seedCount} containers (demo)`);
    }

    // ── Seed container types ──────────────────────────────────────
    const existingContainerTypes = await sList(BUCKET_CONTAINER_TYPES);
    if (existingContainerTypes.length === 0) {
      const now = new Date().toISOString();
      for (const name of ['20ft', '40ft', '40ft-hc', '45ft']) {
        const id = crypto.randomUUID();
        await sSet(BUCKET_CONTAINER_TYPES, id, { id, name, created_at: now });
      }
      console.log('✅ Seeded container types');
    }

    // ── Seed cargo types ──────────────────────────────────────────
    const existingCargoTypes = await sList(BUCKET_CARGO_TYPES);
    if (existingCargoTypes.length === 0) {
      const now = new Date().toISOString();
      const names = [
        'Điện tử',
        'Hàng dệt may',
        'Thực phẩm đông lạnh',
        'Nông sản',
        'Hóa chất công nghiệp',
        'Máy móc thiết bị',
        'Hàng lạnh',
      ];
      for (const name of names) {
        const id = crypto.randomUUID();
        await sSet(BUCKET_CARGO_TYPES, id, { id, name, created_at: now });
      }
      console.log('✅ Seeded cargo types');
    }

    // ── Seed fees config ──────────────────────────────────────────
    const fees = await sGet(BUCKET_FEES, 'default');
    if (!fees) {
      const now = new Date().toISOString();
      await sSet(BUCKET_FEES, 'default', {
        id: 'default',
        currency: 'VND',
        // costRate dùng để ước tính chi phí (profit = revenue * (1 - costRate))
        costRate: 0.35,
        // ratePerKg dùng để ước tính doanh thu theo trọng lượng
        ratePerKgDefault: 1000,
        // có thể ghi đè theo cargo_type
        ratePerKgByCargoType: {
          'Điện tử': 1300,
          'Hàng dệt may': 900,
          'Thực phẩm đông lạnh': 1200,
          'Nông sản': 800,
          'Hóa chất công nghiệp': 1500,
          'Máy móc thiết bị': 1100,
          'Hàng lạnh': 1250,
        },
        updated_at: now,
      });
      console.log('✅ Seeded fees config');
    }

    // ── Seed permissions config ───────────────────────────────────
    const permissions = await sGet(BUCKET_PERMISSIONS, 'default');
    if (!permissions) {
      const now = new Date().toISOString();
      await sSet(BUCKET_PERMISSIONS, 'default', {
        id: 'default',
        updated_at: now,
        roles: {
          admin: ['*'],
          planner: ['dashboard:view', 'schedule:view'],
          operator: ['containers:view', 'containers:update-status'],
          customer: ['containers:mine:view'],
        },
      });
      console.log('✅ Seeded permissions config');
    }

    // ── Seed shipping companies (hãng tàu) ──────────────────────
    const existingShipping = await sList(BUCKET_SHIPPING_COMPANIES);
    if (existingShipping.length === 0) {
      const now = new Date().toISOString();
      const defaults = [
        { name: 'Hãng tàu Ocean Star', phone: '028-1111-2222', email: 'support@oceanstar.vn', address: 'TP.HCM' },
        { name: 'Pacific Dream Lines', phone: '028-3333-4444', email: 'contact@pacificdream.vn', address: 'TP.HCM' },
        { name: 'Sea Harmony Shipping', phone: '028-5555-6666', email: 'info@seaharmony.vn', address: 'TP.HCM' },
        { name: 'Blue Wave Shipping', phone: '028-7777-8888', email: 'hello@bluewave.vn', address: 'TP.HCM' },
      ];
      for (const item of defaults) {
        const id = crypto.randomUUID();
        await sSet(BUCKET_SHIPPING_COMPANIES, id, { id, ...item, created_at: now });
      }
      console.log('✅ Seeded shipping companies');
    }

    // ── Seed schedules (quản lý lịch) ───────────────────────────
    const existingSchedules = await sList(BUCKET_SCHEDULES);
    if (existingSchedules.length === 0) {
      const now = new Date().toISOString();
      const schedules = [
        {
          company_name: 'Hãng tàu Ocean Star',
          ship_name: 'MV Ocean Star',
          type: 'import',
          time_start: '2026-03-27T08:00:00.000Z',
          time_end: '2026-03-27T10:00:00.000Z',
          location: 'Bến số 3',
          containers: 45,
          status: 'in-progress',
        },
        {
          company_name: 'Pacific Dream Lines',
          ship_name: 'MV Pacific Dream',
          type: 'export',
          time_start: '2026-03-27T10:30:00.000Z',
          time_end: '2026-03-27T12:00:00.000Z',
          location: 'Bến số 1',
          containers: 38,
          status: 'scheduled',
        },
        {
          company_name: 'Sea Harmony Shipping',
          ship_name: 'MV Sea Harmony',
          type: 'import',
          time_start: '2026-03-27T14:00:00.000Z',
          time_end: '2026-03-27T16:00:00.000Z',
          location: 'Bến số 2',
          containers: 52,
          status: 'scheduled',
        },
        {
          company_name: 'Blue Wave Shipping',
          ship_name: 'MV Blue Wave',
          type: 'export',
          time_start: '2026-03-27T16:30:00.000Z',
          time_end: '2026-03-27T18:00:00.000Z',
          location: 'Bến số 4',
          containers: 29,
          status: 'scheduled',
        },
      ];
      for (const s of schedules) {
        const id = crypto.randomUUID();
        await sSet(BUCKET_SCHEDULES, id, { id, ...s, created_at: now, updated_at: now });
      }
      console.log('✅ Seeded schedules');
    }

    // ── Seed notifications for demo ─────────────────────────────────
    const existingNotifs = await sList(BUCKET_NOTIFICATIONS);
    if (existingNotifs.length === 0) {
      const now = new Date();
      const seeds = [
        {
          title: 'Cảnh báo kho đầy',
          message: 'Số lượng container trong kho đang tiến gần ngưỡng sức chứa. Hãy kiểm tra khu vực A/B.',
          type: 'warning',
          read: false,
        },
        {
          title: 'Đơn hàng mới',
          message: 'Có 3 đơn hàng mới vừa được tạo và đang chờ xử lý.',
          type: 'info',
          read: false,
        },
        {
          title: 'Lệnh nhập thành công',
          message: 'Lệnh nhập kho theo lịch hôm nay đã hoàn tất.',
          type: 'info',
          read: true,
        },
        {
          title: 'Lệnh xuất thành công',
          message: 'Lệnh xuất hàng đã được xác nhận hoàn tất.',
          type: 'info',
          read: true,
        },
        {
          title: 'Cảnh báo hàng hỏng',
          message: 'Một số container có dấu hiệu hỏng/rách. Vui lòng kiểm tra trước khi xuất.',
          type: 'error',
          read: false,
        },
      ];

      for (let i = 0; i < seeds.length; i++) {
        const n = seeds[i];
        const id = crypto.randomUUID();
        const created_at = new Date(now.getTime() - i * 7 * 60 * 1000).toISOString();
        await sSet(BUCKET_NOTIFICATIONS, id, {
          id,
          title: n.title,
          message: n.message,
          type: n.type,
          read: n.read,
          archived: false,
          created_at,
          created_by: 'u-admin',
        });
      }
      console.log('✅ Seeded demo notifications');
    }

    console.log('🚀 Hùng Thủy server ready — database pre-seeded');
  } catch (e) {
    console.error('Startup seed error:', e);
  }
}

autoSeedOnStartup();

// ============================================================
// HEALTH
// ============================================================
app.get('/make-server-ce1eb60c/health', (c) =>
  c.json({ status: 'ok', service: 'Hùng Thủy Warehouse API', version: '2.0' })
);

// ============================================================
// AUTH — ĐĂNG NHẬP (so sánh với database)
// ============================================================
app.post('/make-server-ce1eb60c/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: 'Email và mật khẩu là bắt buộc' }, 400);

    // Tìm user theo email trong tất cả users
    const allUsers = await sList(BUCKET_USERS);
    const user = allUsers.find((u: any) => u.email?.toLowerCase() === email.toLowerCase().trim());

    if (!user) return c.json({ error: 'Email không tồn tại trong hệ thống' }, 401);
    if (user.status === 'inactive') return c.json({ error: 'Tài khoản đã bị khóa' }, 403);

    // So sánh mật khẩu
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return c.json({ error: 'Mật khẩu không đúng' }, 401);

    // Tạo JWT
    const token = await signJWT({
      id: user.id, email: user.email, name: user.name,
      role: user.role, company: user.company, phone: user.phone,
    });

    // Ghi nhật ký đăng nhập
    const logId = crypto.randomUUID();
    await sSet(BUCKET_ACTIVITIES, logId, {
      id: logId, user_id: user.id, user_name: user.name,
      action_type: 'login', entity_type: 'auth', entity_id: user.id,
      description: `${user.name} (${user.role}) đăng nhập hệ thống`,
      created_at: new Date().toISOString(),
    });

    return c.json({
      token,
      user: {
        id: user.id, email: user.email, name: user.name,
        role: user.role, company: user.company, phone: user.phone,
      }
    });
  } catch (e: any) {
    console.error('Login error:', e);
    return c.json({ error: 'Lỗi server: ' + e.message }, 500);
  }
});

// ============================================================
// AUTH — ĐĂNG KÝ
// ============================================================
app.post('/make-server-ce1eb60c/auth/register', async (c) => {
  try {
    const { email, password, name, company, phone } = await c.req.json();
    if (!email || !password || !name) return c.json({ error: 'Email, mật khẩu và họ tên là bắt buộc' }, 400);
    if (password.length < 6) return c.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, 400);

    const allUsers = await sList(BUCKET_USERS);
    if (allUsers.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())) {
      return c.json({ error: 'Email này đã được đăng ký' }, 400);
    }

    const id   = `u-${crypto.randomUUID()}`;
    const hash = await bcrypt.hash(password, 10);
    const newUser = {
      id, email: email.toLowerCase(), name, company: company || '', phone: phone || '',
      role: 'customer', password_hash: hash,
      address: '',
      preferences: {
        language: 'vi',
        theme: 'light',
        notifications: {
          new_orders: true,
          low_stock: true,
          weekly_report: true,
          system_alerts: true,
        }
      },
      status: 'active', created_at: new Date().toISOString(),
    };
    await sSet(BUCKET_USERS, id, newUser);
    console.log(`✅ Registered new user: ${email}`);
    return c.json({ message: 'Đăng ký thành công', user: { id, email, name, role: 'customer' } });
  } catch (e: any) {
    return c.json({ error: 'Lỗi đăng ký: ' + e.message }, 500);
  }
});

// ============================================================
// AUTH — XEM THÔNG TIN BẢN THÂN
// ============================================================
app.get('/make-server-ce1eb60c/auth/me', authMiddleware, async (c) => {
  const u = c.get('authUser');
  const existing = await sGet(BUCKET_USERS, u.id);
  const address = existing?.address || '';
  const preferences = existing?.preferences || null;
  return c.json({
    id: u.id,
    email: u.email,
    name: existing?.name || u.name,
    role: u.role,
    company: existing?.company || u.company,
    phone: existing?.phone || u.phone,
    address,
    preferences,
  });
});

// ============================================================
// AUTH — CẬP NHẬT THÔNG TIN CÁ NHÂN
// ============================================================
app.put('/make-server-ce1eb60c/auth/profile', authMiddleware, async (c) => {
  try {
    const u = c.get('authUser');
    const body = await c.req.json();
    const name = body?.name ? String(body.name) : u.name;
    const company = typeof body?.company === 'string' ? body.company : (u.company || '');
    const phone = typeof body?.phone === 'string' ? body.phone : (u.phone || '');
    const address = typeof body?.address === 'string' ? body.address : '';

    const existing = await sGet(BUCKET_USERS, u.id);
    if (!existing) return c.json({ error: 'Không tìm thấy user' }, 404);

    await sSet(BUCKET_USERS, u.id, { ...existing, name, company, phone, address, updated_at: new Date().toISOString() });

    const logId = crypto.randomUUID();
    await sSet(BUCKET_ACTIVITIES, logId, {
      id: logId,
      user_id: u.id,
      user_name: name,
      action_type: 'update',
      entity_type: 'profile',
      entity_id: u.id,
      description: `Cập nhật thông tin cá nhân`,
      created_at: new Date().toISOString(),
    });

    return c.json({ message: 'Cập nhật thông tin thành công', user: { id: u.id, email: u.email, name, company, phone, address } });
  } catch (e: any) {
    return c.json({ error: 'Lỗi cập nhật profile: ' + e.message }, 500);
  }
});

// ============================================================
// AUTH — ĐỔI MẬT KHẨU
// ============================================================
app.put('/make-server-ce1eb60c/auth/change-password', authMiddleware, async (c) => {
  try {
    const u = c.get('authUser');
    const body = await c.req.json();
    const currentPassword = body?.currentPassword ? String(body.currentPassword) : '';
    const newPassword = body?.newPassword ? String(body.newPassword) : '';

    if (!currentPassword || !newPassword) return c.json({ error: 'Thiếu thông tin' }, 400);
    if (newPassword.length < 6) return c.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, 400);

    const existing = await sGet(BUCKET_USERS, u.id);
    if (!existing) return c.json({ error: 'Không tìm thấy user' }, 404);

    const match = await bcrypt.compare(currentPassword, existing.password_hash);
    if (!match) return c.json({ error: 'Mật khẩu hiện tại không đúng' }, 401);

    const hash = await bcrypt.hash(newPassword, 10);
    await sSet(BUCKET_USERS, u.id, { ...existing, password_hash: hash, updated_at: new Date().toISOString() });

    const logId = crypto.randomUUID();
    await sSet(BUCKET_ACTIVITIES, logId, {
      id: logId,
      user_id: u.id,
      user_name: existing.name,
      action_type: 'update',
      entity_type: 'password',
      entity_id: u.id,
      description: `Đổi mật khẩu`,
      created_at: new Date().toISOString(),
    });

    return c.json({ message: 'Đổi mật khẩu thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi đổi mật khẩu: ' + e.message }, 500);
  }
});

// ============================================================
// AUTH — GET/PUT PREFERENCES
// ============================================================
app.get('/make-server-ce1eb60c/auth/preferences', authMiddleware, async (c) => {
  try {
    const u = c.get('authUser');
    const existing = await sGet(BUCKET_USERS, u.id);
    if (!existing) return c.json({ error: 'Không tìm thấy user' }, 404);

    const defaultPrefs = {
      language: 'vi',
      theme: 'light',
      notifications: {
        new_orders: true,
        low_stock: true,
        weekly_report: true,
        system_alerts: true,
      },
    };

    return c.json({
      preferences: existing.preferences || defaultPrefs,
    });
  } catch (e: any) {
    return c.json({ error: 'Lỗi lấy preferences: ' + e.message }, 500);
  }
});

app.put('/make-server-ce1eb60c/auth/preferences', authMiddleware, async (c) => {
  try {
    const u = c.get('authUser');
    const body = await c.req.json();

    const existing = await sGet(BUCKET_USERS, u.id);
    if (!existing) return c.json({ error: 'Không tìm thấy user' }, 404);

    const defaultPrefs = {
      language: 'vi',
      theme: 'light',
      notifications: {
        new_orders: true,
        low_stock: true,
        weekly_report: true,
        system_alerts: true,
      },
    };

    const next = {
      ...(existing.preferences || defaultPrefs),
      ...(body || {}),
    };

    await sSet(BUCKET_USERS, u.id, { ...existing, preferences: next, updated_at: new Date().toISOString() });

    // Nhật ký hoạt động: ghi lại thay đổi preferences (ngôn ngữ / giao diện / kênh thông báo)
    const logId = crypto.randomUUID();
    await sSet(BUCKET_ACTIVITIES, logId, {
      id: logId,
      user_id: u.id,
      user_name: existing.name,
      action_type: 'update',
      entity_type: 'preferences',
      entity_id: u.id,
      description: `Cập nhật preferences: language=${next.language}, theme=${next.theme}`,
      created_at: new Date().toISOString(),
    });
    return c.json({ message: 'Cập nhật preferences thành công', preferences: next });
  } catch (e: any) {
    return c.json({ error: 'Lỗi cập nhật preferences: ' + e.message }, 500);
  }
});

// ============================================================
// CONTAINERS — DANH SÁCH
// ============================================================
app.get('/make-server-ce1eb60c/containers', authMiddleware, requireRole('admin', 'planner', 'operator'), async (c) => {
  try {
    const containers = (await sList(BUCKET_CONTAINERS))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return c.json({ containers });
  } catch (e: any) {
    return c.json({ error: 'Lỗi lấy container: ' + e.message }, 500);
  }
});

app.get('/make-server-ce1eb60c/containers/my', authMiddleware, async (c) => {
  try {
    const u = c.get('authUser');
    const all = await sList(BUCKET_CONTAINERS);
    const containers = all
      .filter((c: any) => c.customer_id === u.id)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return c.json({ containers });
  } catch (e: any) {
    return c.json({ error: 'Lỗi: ' + e.message }, 500);
  }
});

// ============================================================
// CONTAINERS — THÊM MỚI
// ============================================================
app.post('/make-server-ce1eb60c/containers', authMiddleware, requireRole('admin', 'planner'), async (c) => {
  try {
    const u    = c.get('authUser');
    const body = await c.req.json();
    if (!body.container_number || !body.container_type) {
      return c.json({ error: 'Mã container và loại là bắt buộc' }, 400);
    }
    const all = await sList(BUCKET_CONTAINERS);
    if (all.find((x: any) => x.container_number === body.container_number)) {
      return c.json({ error: 'Mã container đã tồn tại' }, 400);
    }
    const id  = crypto.randomUUID();
    const now = new Date().toISOString();
    const container = {
      id, ...body,
      position: `${body.zone || 'A'}-${body.block || '01'}-${body.slot || '001'}`,
      created_by: u.id, created_by_name: u.name,
      created_at: now, updated_at: now,
    };
    await sSet(BUCKET_CONTAINERS, id, container);
    const logId = crypto.randomUUID();
    await sSet(BUCKET_ACTIVITIES, logId, {
      id: logId, user_id: u.id, user_name: u.name, action_type: 'create',
      entity_type: 'container', entity_id: body.container_number,
      description: `Thêm container ${body.container_number}`,
      created_at: now,
    });
    return c.json({ container, message: 'Thêm container thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi thêm container: ' + e.message }, 500);
  }
});

// ============================================================
// CONTAINERS — CẬP NHẬT
// ============================================================
app.put('/make-server-ce1eb60c/containers/:id', authMiddleware, requireRole('admin', 'planner'), async (c) => {
  try {
    const id   = c.req.param('id');
    const u    = c.get('authUser');
    const body = await c.req.json();
    const ex   = await sGet(BUCKET_CONTAINERS, id);
    if (!ex) return c.json({ error: 'Không tìm thấy container' }, 404);
    const updated = {
      ...ex, ...body,
      position: `${body.zone || ex.zone}-${body.block || ex.block}-${body.slot || ex.slot}`,
      updated_at: new Date().toISOString(),
    };
    await sSet(BUCKET_CONTAINERS, id, updated);
    const logId = crypto.randomUUID();
    await sSet(BUCKET_ACTIVITIES, logId, {
      id: logId, user_id: u.id, user_name: u.name, action_type: 'update',
      entity_type: 'container', entity_id: ex.container_number,
      description: `Cập nhật container ${ex.container_number}`,
      created_at: new Date().toISOString(),
    });
    return c.json({ container: updated, message: 'Cập nhật thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi cập nhật: ' + e.message }, 500);
  }
});

// ============================================================
// CONTAINERS — CẬP NHẬT TRẠNG THÁI
// ============================================================
app.patch('/make-server-ce1eb60c/containers/:id/status', authMiddleware, requireRole('admin', 'planner', 'operator'), async (c) => {
  try {
    const id = c.req.param('id');
    const u  = c.get('authUser');
    const { status } = await c.req.json();
    if (u.role === 'operator' && status !== 'exported') {
      return c.json({ error: 'Operator chỉ được đánh dấu "Đã xuất"' }, 403);
    }
    const ex = await sGet(BUCKET_CONTAINERS, id);
    if (!ex) return c.json({ error: 'Không tìm thấy container' }, 404);
    const now     = new Date().toISOString();
    const updated = { ...ex, status, updated_at: now, ...(status === 'exported' ? { export_date: now } : {}) };
    await sSet(BUCKET_CONTAINERS, id, updated);
    const logId = crypto.randomUUID();
    await sSet(BUCKET_ACTIVITIES, logId, {
      id: logId, user_id: u.id, user_name: u.name, action_type: 'status_change',
      entity_type: 'container', entity_id: ex.container_number,
      description: `Đổi trạng thái ${ex.container_number} → ${status}`,
      created_at: now,
    });
    return c.json({ container: updated, message: 'Cập nhật trạng thái thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi: ' + e.message }, 500);
  }
});

// ============================================================
// CONTAINERS — XÓA
// ============================================================
app.delete('/make-server-ce1eb60c/containers/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const u  = c.get('authUser');
    const ex = await sGet(BUCKET_CONTAINERS, id);
    if (!ex) return c.json({ error: 'Không tìm thấy container' }, 404);
    await sDel(BUCKET_CONTAINERS, id);
    const logId = crypto.randomUUID();
    await sSet(BUCKET_ACTIVITIES, logId, {
      id: logId, user_id: u.id, user_name: u.name, action_type: 'delete',
      entity_type: 'container', entity_id: ex.container_number,
      description: `Xóa container ${ex.container_number}`,
      created_at: new Date().toISOString(),
    });
    return c.json({ message: 'Xóa thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi xóa: ' + e.message }, 500);
  }
});

// ============================================================
// DASHBOARD STATS
// ============================================================
app.get('/make-server-ce1eb60c/dashboard/stats', authMiddleware, requireRole('admin', 'planner', 'operator'), async (c) => {
  try {
    const containers  = await sList(BUCKET_CONTAINERS);
    const activities  = (await sList(BUCKET_ACTIVITIES))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15);
    return c.json({
      stats: {
        total:      containers.length,
        pending:    containers.filter((c: any) => c.status === 'pending').length,
        in_storage: containers.filter((c: any) => c.status === 'in_storage').length,
        exported:   containers.filter((c: any) => c.status === 'exported').length,
        by_type: containers.reduce((acc: any, c: any) => { acc[c.container_type] = (acc[c.container_type] || 0) + 1; return acc; }, {}),
        by_zone: containers.reduce((acc: any, c: any) => { acc[c.zone || 'A'] = (acc[c.zone || 'A'] || 0) + 1; return acc; }, {}),
      },
      activities,
    });
  } catch (e: any) {
    return c.json({ error: 'Lỗi thống kê: ' + e.message }, 500);
  }
});

// ============================================================
// ACTIVITIES — LỊCH SỬ HOẠT ĐỘNG
// ============================================================
app.get('/make-server-ce1eb60c/activities', authMiddleware, requireRole('admin', 'planner', 'operator'), async (c) => {
  try {
    const limitRaw = c.req.query('limit');
    const limit = limitRaw ? Math.max(1, Math.min(200, parseInt(limitRaw))) : 50;
    const activities = (await sList(BUCKET_ACTIVITIES))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
    return c.json({ activities });
  } catch (e: any) {
    return c.json({ error: 'Lỗi lấy nhật ký hoạt động: ' + e.message }, 500);
  }
});

// ============================================================
// NOTIFICATIONS — QUẢN LÝ THÔNG BÁO
// ============================================================
app.get('/make-server-ce1eb60c/notifications', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const limitRaw = c.req.query('limit');
    const limit = limitRaw ? Math.max(1, Math.min(200, parseInt(limitRaw))) : 100;
    const notifications = (await sList(BUCKET_NOTIFICATIONS))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
    return c.json({ notifications });
  } catch (e: any) {
    return c.json({ error: 'Lỗi lấy thông báo: ' + e.message }, 500);
  }
});

app.post('/make-server-ce1eb60c/notifications', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();
    const { title, message, type } = body || {};
    if (!title || !message) return c.json({ error: 'Thiếu title hoặc message' }, 400);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const notification = {
      id,
      title: String(title),
      message: String(message),
      type: type ? String(type) : 'info',
      read: false,
      archived: false,
      created_at: now,
      created_by: (c.get('authUser')?.id) || 'unknown',
    };
    await sSet(BUCKET_NOTIFICATIONS, id, notification);

    const u = c.get('authUser');
    const logId = crypto.randomUUID();
    await sSet(BUCKET_ACTIVITIES, logId, {
      id: logId,
      user_id: u.id,
      user_name: u.name,
      action_type: 'create',
      entity_type: 'notification',
      entity_id: notification.id,
      description: `Tạo thông báo: ${notification.title}`,
      created_at: now,
    });

    return c.json({ notification, message: 'Tạo thông báo thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi tạo thông báo: ' + e.message }, 500);
  }
});

app.patch('/make-server-ce1eb60c/notifications/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const ex = await sGet(BUCKET_NOTIFICATIONS, id);
    if (!ex) return c.json({ error: 'Không tìm thấy thông báo' }, 404);

    const updated = {
      ...ex,
      ...(body?.title ? { title: String(body.title) } : {}),
      ...(body?.message ? { message: String(body.message) } : {}),
      ...(body?.type ? { type: String(body.type) } : {}),
      ...(typeof body?.read === 'boolean' ? { read: body.read } : {}),
      ...(typeof body?.archived === 'boolean' ? { archived: body.archived } : {}),
      updated_at: new Date().toISOString(),
    };
    await sSet(BUCKET_NOTIFICATIONS, id, updated);
    return c.json({ notification: updated, message: 'Cập nhật thông báo thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi cập nhật thông báo: ' + e.message }, 500);
  }
});

app.delete('/make-server-ce1eb60c/notifications/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const ex = await sGet(BUCKET_NOTIFICATIONS, id);
    if (!ex) return c.json({ error: 'Không tìm thấy thông báo' }, 404);

    const u = c.get('authUser');
    await sDel(BUCKET_NOTIFICATIONS, id);

    const logId = crypto.randomUUID();
    await sSet(BUCKET_ACTIVITIES, logId, {
      id: logId,
      user_id: u.id,
      user_name: u.name,
      action_type: 'delete',
      entity_type: 'notification',
      entity_id: id,
      description: `Xóa thông báo: ${ex.title}`,
      created_at: new Date().toISOString(),
    });

    return c.json({ message: 'Xóa thông báo thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi xóa thông báo: ' + e.message }, 500);
  }
});

// ============================================================
// TYPES — LOẠI CONTAINER / LOẠI HÀNG
// ============================================================
app.get('/make-server-ce1eb60c/container-types', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const items = (await sList(BUCKET_CONTAINER_TYPES))
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
    return c.json({ items });
  } catch (e: any) {
    return c.json({ error: 'Lỗi lấy container types: ' + e.message }, 500);
  }
});

app.post('/make-server-ce1eb60c/container-types', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();
    const { name } = body || {};
    if (!name) return c.json({ error: 'Thiếu name' }, 400);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const item = { id, name: String(name), created_at: now };
    await sSet(BUCKET_CONTAINER_TYPES, id, item);
    return c.json({ item, message: 'Thêm loại container thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi thêm loại container: ' + e.message }, 500);
  }
});

app.patch('/make-server-ce1eb60c/container-types/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const ex = await sGet(BUCKET_CONTAINER_TYPES, id);
    if (!ex) return c.json({ error: 'Không tìm thấy loại container' }, 404);
    const updated = { ...ex, name: body?.name ? String(body.name) : ex.name };
    updated.updated_at = new Date().toISOString();
    await sSet(BUCKET_CONTAINER_TYPES, id, updated);
    return c.json({ item: updated, message: 'Cập nhật loại container thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi cập nhật loại container: ' + e.message }, 500);
  }
});

app.delete('/make-server-ce1eb60c/container-types/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    await sDel(BUCKET_CONTAINER_TYPES, id);
    return c.json({ message: 'Xóa loại container thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi xóa loại container: ' + e.message }, 500);
  }
});

app.get('/make-server-ce1eb60c/cargo-types', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const items = (await sList(BUCKET_CARGO_TYPES))
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
    return c.json({ items });
  } catch (e: any) {
    return c.json({ error: 'Lỗi lấy cargo types: ' + e.message }, 500);
  }
});

app.post('/make-server-ce1eb60c/cargo-types', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();
    const { name } = body || {};
    if (!name) return c.json({ error: 'Thiếu name' }, 400);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const item = { id, name: String(name), created_at: now };
    await sSet(BUCKET_CARGO_TYPES, id, item);
    return c.json({ item, message: 'Thêm loại hàng thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi thêm loại hàng: ' + e.message }, 500);
  }
});

app.patch('/make-server-ce1eb60c/cargo-types/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const ex = await sGet(BUCKET_CARGO_TYPES, id);
    if (!ex) return c.json({ error: 'Không tìm thấy loại hàng' }, 404);
    const updated = { ...ex, name: body?.name ? String(body.name) : ex.name };
    updated.updated_at = new Date().toISOString();
    await sSet(BUCKET_CARGO_TYPES, id, updated);
    return c.json({ item: updated, message: 'Cập nhật loại hàng thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi cập nhật loại hàng: ' + e.message }, 500);
  }
});

app.delete('/make-server-ce1eb60c/cargo-types/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    await sDel(BUCKET_CARGO_TYPES, id);
    return c.json({ message: 'Xóa loại hàng thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi xóa loại hàng: ' + e.message }, 500);
  }
});

// ============================================================
// SCHEDULES — QUẢN LÝ LỊCH
// ============================================================
app.get('/make-server-ce1eb60c/schedules', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const items = (await sList(BUCKET_SCHEDULES))
      .sort((a: any, b: any) => new Date(a.time_start).getTime() - new Date(b.time_start).getTime());
    return c.json({ items });
  } catch (e: any) {
    return c.json({ error: 'Lỗi lấy schedules: ' + e.message }, 500);
  }
});

app.post('/make-server-ce1eb60c/schedules', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();
    const { company_name, ship_name, type, time_start, time_end, location, containers, status } = body || {};
    if (!company_name || !ship_name || !type || !time_start || !time_end || !location) {
      return c.json({ error: 'Thiếu thông tin bắt buộc' }, 400);
    }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const item = {
      id,
      company_name: String(company_name),
      ship_name: String(ship_name),
      type: String(type),
      time_start: String(time_start),
      time_end: String(time_end),
      location: String(location),
      containers: typeof containers === 'number' ? containers : parseInt(containers || '0', 10) || 0,
      status: status ? String(status) : 'scheduled',
      created_at: now,
      updated_at: now,
    };
    await sSet(BUCKET_SCHEDULES, id, item);
    return c.json({ item, message: 'Thêm schedule thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi thêm schedule: ' + e.message }, 500);
  }
});

app.patch('/make-server-ce1eb60c/schedules/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const ex = await sGet(BUCKET_SCHEDULES, id);
    if (!ex) return c.json({ error: 'Không tìm thấy schedule' }, 404);

    const updated = {
      ...ex,
      ...(body?.company_name ? { company_name: String(body.company_name) } : {}),
      ...(body?.ship_name ? { ship_name: String(body.ship_name) } : {}),
      ...(body?.type ? { type: String(body.type) } : {}),
      ...(body?.time_start ? { time_start: String(body.time_start) } : {}),
      ...(body?.time_end ? { time_end: String(body.time_end) } : {}),
      ...(body?.location ? { location: String(body.location) } : {}),
      ...(typeof body?.containers !== 'undefined'
        ? { containers: typeof body.containers === 'number' ? body.containers : parseInt(body.containers || '0', 10) || 0 }
        : {}),
      ...(body?.status ? { status: String(body.status) } : {}),
      updated_at: new Date().toISOString(),
    };

    await sSet(BUCKET_SCHEDULES, id, updated);
    return c.json({ item: updated, message: 'Cập nhật schedule thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi cập nhật schedule: ' + e.message }, 500);
  }
});

app.delete('/make-server-ce1eb60c/schedules/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    await sDel(BUCKET_SCHEDULES, id);
    return c.json({ message: 'Xóa schedule thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi xóa schedule: ' + e.message }, 500);
  }
});

// ============================================================
// SHIPPING COMPANIES — HÃNG TÀU
// ============================================================
app.get('/make-server-ce1eb60c/shipping-companies', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const items = (await sList(BUCKET_SHIPPING_COMPANIES))
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
    return c.json({ items });
  } catch (e: any) {
    return c.json({ error: 'Lỗi lấy shipping-companies: ' + e.message }, 500);
  }
});

app.post('/make-server-ce1eb60c/shipping-companies', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();
    const { name, phone, email, address } = body || {};
    if (!name) return c.json({ error: 'Thiếu name' }, 400);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const item = {
      id,
      name: String(name),
      phone: phone ? String(phone) : '',
      email: email ? String(email) : '',
      address: address ? String(address) : '',
      created_at: now,
    };
    await sSet(BUCKET_SHIPPING_COMPANIES, id, item);
    return c.json({ item, message: 'Thêm hãng tàu thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi thêm hãng tàu: ' + e.message }, 500);
  }
});

app.patch('/make-server-ce1eb60c/shipping-companies/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const ex = await sGet(BUCKET_SHIPPING_COMPANIES, id);
    if (!ex) return c.json({ error: 'Không tìm thấy hãng tàu' }, 404);

    const updated = {
      ...ex,
      ...(body?.name ? { name: String(body.name) } : {}),
      ...(typeof body?.phone !== 'undefined' ? { phone: body.phone ? String(body.phone) : '' } : {}),
      ...(typeof body?.email !== 'undefined' ? { email: body.email ? String(body.email) : '' } : {}),
      ...(typeof body?.address !== 'undefined' ? { address: body.address ? String(body.address) : '' } : {}),
    };

    await sSet(BUCKET_SHIPPING_COMPANIES, id, updated);
    return c.json({ item: updated, message: 'Cập nhật hãng tàu thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi cập nhật hãng tàu: ' + e.message }, 500);
  }
});

app.delete('/make-server-ce1eb60c/shipping-companies/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    await sDel(BUCKET_SHIPPING_COMPANIES, id);
    return c.json({ message: 'Xóa hãng tàu thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi xóa hãng tàu: ' + e.message }, 500);
  }
});

// ============================================================
// ADMIN — SEED DEMO TYPES
// ============================================================
app.post('/make-server-ce1eb60c/admin/seed/container-types', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const existing = await sList(BUCKET_CONTAINER_TYPES);
    if (existing.length > 0) {
      return c.json({ message: 'Đã có dữ liệu container-types, bỏ qua seed', seeded: 0 });
    }

    const now = new Date().toISOString();
    const defaults = ['20ft', '40ft', '40ft-hc', '45ft'];
    for (const name of defaults) {
      const id = crypto.randomUUID();
      await sSet(BUCKET_CONTAINER_TYPES, id, { id, name, created_at: now });
    }
    return c.json({ message: 'Seed container-types thành công', seeded: defaults.length });
  } catch (e: any) {
    return c.json({ error: 'Lỗi seed container-types: ' + e.message }, 500);
  }
});

app.post('/make-server-ce1eb60c/admin/seed/cargo-types', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const existing = await sList(BUCKET_CARGO_TYPES);
    if (existing.length > 0) {
      return c.json({ message: 'Đã có dữ liệu cargo-types, bỏ qua seed', seeded: 0 });
    }

    const now = new Date().toISOString();
    const defaults = [
      'Điện tử',
      'Hàng dệt may',
      'Thực phẩm đông lạnh',
      'Nông sản',
      'Hóa chất công nghiệp',
      'Máy móc thiết bị',
      'Hàng lạnh',
    ];
    for (const name of defaults) {
      const id = crypto.randomUUID();
      await sSet(BUCKET_CARGO_TYPES, id, { id, name, created_at: now });
    }
    return c.json({ message: 'Seed cargo-types thành công', seeded: defaults.length });
  } catch (e: any) {
    return c.json({ error: 'Lỗi seed cargo-types: ' + e.message }, 500);
  }
});

app.post('/make-server-ce1eb60c/admin/seed/schedules', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const existing = await sList(BUCKET_SCHEDULES);
    if (existing.length > 0) {
      return c.json({ message: 'Đã có dữ liệu schedules, bỏ qua seed', seeded: 0 });
    }
    const now = new Date().toISOString();
    const defaults = [
      {
        company_name: 'Hãng tàu Ocean Star',
        ship_name: 'MV Ocean Star',
        type: 'import',
        time_start: '2026-03-27T08:00:00.000Z',
        time_end: '2026-03-27T10:00:00.000Z',
        location: 'Bến số 3',
        containers: 45,
        status: 'in-progress',
      },
      {
        company_name: 'Pacific Dream Lines',
        ship_name: 'MV Pacific Dream',
        type: 'export',
        time_start: '2026-03-27T10:30:00.000Z',
        time_end: '2026-03-27T12:00:00.000Z',
        location: 'Bến số 1',
        containers: 38,
        status: 'scheduled',
      },
      {
        company_name: 'Sea Harmony Shipping',
        ship_name: 'MV Sea Harmony',
        type: 'import',
        time_start: '2026-03-27T14:00:00.000Z',
        time_end: '2026-03-27T16:00:00.000Z',
        location: 'Bến số 2',
        containers: 52,
        status: 'scheduled',
      },
    ];
    for (const s of defaults) {
      const id = crypto.randomUUID();
      await sSet(BUCKET_SCHEDULES, id, { id, ...s, created_at: now, updated_at: now });
    }
    return c.json({ message: 'Seed schedules thành công', seeded: defaults.length });
  } catch (e: any) {
    return c.json({ error: 'Lỗi seed schedules: ' + e.message }, 500);
  }
});

app.post('/make-server-ce1eb60c/admin/seed/shipping-companies', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const existing = await sList(BUCKET_SHIPPING_COMPANIES);
    if (existing.length > 0) {
      return c.json({ message: 'Đã có dữ liệu shipping-companies, bỏ qua seed', seeded: 0 });
    }
    const now = new Date().toISOString();
    const defaults = [
      { name: 'Hãng tàu Ocean Star', phone: '028-1111-2222', email: 'support@oceanstar.vn', address: 'TP.HCM' },
      { name: 'Pacific Dream Lines', phone: '028-3333-4444', email: 'contact@pacificdream.vn', address: 'TP.HCM' },
      { name: 'Sea Harmony Shipping', phone: '028-5555-6666', email: 'info@seaharmony.vn', address: 'TP.HCM' },
      { name: 'Blue Wave Shipping', phone: '028-7777-8888', email: 'hello@bluewave.vn', address: 'TP.HCM' },
    ];
    for (const item of defaults) {
      const id = crypto.randomUUID();
      await sSet(BUCKET_SHIPPING_COMPANIES, id, { id, ...item, created_at: now });
    }
    return c.json({ message: 'Seed shipping-companies thành công', seeded: defaults.length });
  } catch (e: any) {
    return c.json({ error: 'Lỗi seed shipping-companies: ' + e.message }, 500);
  }
});

// ============================================================
// FEES — CƯỚC PHÍ / BIỂU CƯỚC
// ============================================================
app.get('/make-server-ce1eb60c/fees', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const fees = await sGet(BUCKET_FEES, 'default');
    return c.json({ fees: fees || null });
  } catch (e: any) {
    return c.json({ error: 'Lỗi lấy cước phí: ' + e.message }, 500);
  }
});

app.put('/make-server-ce1eb60c/fees', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const existing = await sGet(BUCKET_FEES, 'default');
    const updated = { ...(existing || { id: 'default' }), ...body, updated_at: now };
    await sSet(BUCKET_FEES, 'default', updated);
    return c.json({ fees: updated, message: 'Cập nhật cước phí thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi cập nhật cước phí: ' + e.message }, 500);
  }
});

// ============================================================
// PERMISSIONS — PHÂN QUYỀN (UI quản trị)
// ============================================================
app.get('/make-server-ce1eb60c/permissions', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const permissions = await sGet(BUCKET_PERMISSIONS, 'default');
    return c.json({ permissions: permissions || null });
  } catch (e: any) {
    return c.json({ error: 'Lỗi lấy phân quyền: ' + e.message }, 500);
  }
});

app.put('/make-server-ce1eb60c/permissions', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const existing = await sGet(BUCKET_PERMISSIONS, 'default');
    const updated = { ...(existing || { id: 'default' }), ...body, updated_at: now };
    await sSet(BUCKET_PERMISSIONS, 'default', updated);
    return c.json({ permissions: updated, message: 'Cập nhật phân quyền thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi cập nhật phân quyền: ' + e.message }, 500);
  }
});

// ============================================================
// BACKUP — SAO LƯU DỮ LIỆU (JSON)
// ============================================================
app.get('/make-server-ce1eb60c/admin/backup', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const users = await sList(BUCKET_USERS);
    const containers = await sList(BUCKET_CONTAINERS);
    const activities = await sList(BUCKET_ACTIVITIES);
    const notifications = await sList(BUCKET_NOTIFICATIONS);
    const containerTypes = await sList(BUCKET_CONTAINER_TYPES);
    const cargoTypes = await sList(BUCKET_CARGO_TYPES);
    const fees = await sGet(BUCKET_FEES, 'default');
    const permissions = await sGet(BUCKET_PERMISSIONS, 'default');

    return c.json({
      exported_at: new Date().toISOString(),
      users,
      containers,
      activities,
      notifications,
      containerTypes,
      cargoTypes,
      fees,
      permissions,
    });
  } catch (e: any) {
    return c.json({ error: 'Lỗi sao lưu: ' + e.message }, 500);
  }
});

// ============================================================
// USER MANAGEMENT (Admin only)
// ============================================================
app.get('/make-server-ce1eb60c/users', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const users = (await sList(BUCKET_USERS)).map((u: any) => ({
      id: u.id, email: u.email, name: u.name, role: u.role,
      company: u.company, phone: u.phone, status: u.status, created_at: u.created_at,
    }));
    return c.json({ users });
  } catch (e: any) {
    return c.json({ error: 'Lỗi: ' + e.message }, 500);
  }
});

app.patch('/make-server-ce1eb60c/users/:id/role', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const { role } = await c.req.json();
    if (!['admin', 'planner', 'operator', 'customer'].includes(role)) {
      return c.json({ error: 'Vai trò không hợp lệ' }, 400);
    }
    const user = await sGet(BUCKET_USERS, id);
    if (!user) return c.json({ error: 'Không tìm thấy người dùng' }, 404);
    await sSet(BUCKET_USERS, id, { ...user, role });
    return c.json({ message: 'Cập nhật vai trò thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi: ' + e.message }, 500);
  }
});

app.patch('/make-server-ce1eb60c/users/:id/status', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const me = c.get('authUser');
    const { status } = await c.req.json();
    if (id === me.id) return c.json({ error: 'Không thể khóa tài khoản chính mình' }, 400);
    const user = await sGet(BUCKET_USERS, id);
    if (!user) return c.json({ error: 'Không tìm thấy người dùng' }, 404);
    await sSet(BUCKET_USERS, id, { ...user, status });
    return c.json({ message: `Tài khoản đã ${status === 'active' ? 'kích hoạt' : 'khóa'}` });
  } catch (e: any) {
    return c.json({ error: 'Lỗi: ' + e.message }, 500);
  }
});

app.delete('/make-server-ce1eb60c/users/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const me = c.get('authUser');
    if (id === me.id) return c.json({ error: 'Không thể xóa tài khoản chính mình' }, 400);
    if (['u-admin', 'u-planner', 'u-operator', 'u-customer'].includes(id)) {
      return c.json({ error: 'Không thể xóa tài khoản demo mặc định' }, 400);
    }
    const user = await sGet(BUCKET_USERS, id);
    if (!user) return c.json({ error: 'Không tìm thấy người dùng' }, 404);
    await sDel(BUCKET_USERS, id);
    return c.json({ message: 'Xóa người dùng thành công' });
  } catch (e: any) {
    return c.json({ error: 'Lỗi: ' + e.message }, 500);
  }
});

// ============================================================
// LEGACY SEED ENDPOINT (vẫn giữ để tương thích)
// ============================================================
app.post('/make-server-ce1eb60c/seed-demo-users', async (c) => {
  await autoSeedOnStartup();
  return c.json({ message: 'Seed hoàn tất', results: DEMO_USERS.map(u => ({ email: u.email, status: 'ok' })) });
});

Deno.serve(app.fetch);