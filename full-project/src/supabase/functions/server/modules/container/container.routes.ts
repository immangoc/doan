// Container module — port từ ContainerController + ContainerCatalogController
// Mount: /admin/containers, /admin/container-types, /admin/cargo-types, /admin/cargo-attributes, /admin/container-statuses
import { Hono } from 'npm:hono';
import { sql, tx } from '../../db.ts';
import { ok, fail, page } from '../../common/response.ts';
import { authV1, requireRoles } from '../../common/auth-v1.ts';

const r = new Hono();

const STAFF = requireRoles('ADMIN', 'OPERATOR');
const ANY = requireRoles('ADMIN', 'OPERATOR', 'CUSTOMER');
const ADMIN_ONLY = requireRoles('ADMIN');

// ============================================================
// /admin/containers — full CRUD + history + export-priority + my + repair
// ============================================================
async function enrichPosition(rows: any[]) {
  if (rows.length === 0) return rows;
  const ids = rows.map(r => r.containerId);
  const db = sql();
  const positions = await db`
    SELECT cp.container_id, cp.tier, s.slot_id, s.row_no, s.bay_no,
           b.block_id, b.block_name, z.zone_id, z.zone_name,
           y.yard_id, y.yard_name, yt.yard_type_name
    FROM container_positions cp
    JOIN slots s ON s.slot_id = cp.slot_id
    JOIN blocks b ON b.block_id = s.block_id
    JOIN yard_zones z ON z.zone_id = b.zone_id
    JOIN yards y ON y.yard_id = z.yard_id
    LEFT JOIN yard_types yt ON yt.yard_type_id = y.yard_type_id
    WHERE cp.container_id = ANY(${ids})
  `;
  const byId = new Map<string, any>();
  for (const p of positions) byId.set(p.container_id, p);
  for (const row of rows) {
    const p = byId.get(row.containerId);
    if (p) {
      row.slotId = p.slot_id; row.rowNo = p.row_no; row.bayNo = p.bay_no; row.tier = p.tier;
      row.blockId = p.block_id; row.blockName = p.block_name;
      row.zoneId = p.zone_id; row.zoneName = p.zone_name;
      row.yardId = p.yard_id; row.yardName = p.yard_name; row.yardType = p.yard_type_name;
    }
  }
  return rows;
}

function mapContainer(row: any) {
  return {
    containerId: row.container_id,
    manifestId: row.manifest_id,
    containerTypeId: row.container_type_id,
    containerTypeName: row.container_type_name,
    statusId: row.status_id,
    statusName: row.status_name,
    cargoTypeId: row.cargo_type_id,
    cargoTypeName: row.cargo_type_name,
    attributeId: row.attribute_id,
    attributeName: row.attribute_name,
    grossWeight: row.gross_weight,
    declaredValue: row.declared_value,
    sealNumber: row.seal_number,
    note: row.note,
    createdAt: row.created_at,
  };
}

// Helper: chạy SELECT container với điều kiện động (parameterized).
async function selectContainers(opts: {
  keyword?: string; statusName?: string;
  customerId?: number; limit: number; offset: number;
}) {
  const db = sql();
  const kw = opts.keyword ? `%${opts.keyword}%` : null;
  // Dùng postgres-js: NULL trong điều kiện = "không filter"
  if (opts.customerId != null) {
    return await db`
      SELECT c.container_id, c.manifest_id, c.container_type_id, ct.container_type_name,
             c.status_id, cs.status_name, c.cargo_type_id, ca.cargo_type_name,
             c.attribute_id, attr.attribute_name,
             c.gross_weight, c.declared_value, c.seal_number, c.note, c.created_at
      FROM container c
      LEFT JOIN container_types     ct   ON ct.container_type_id = c.container_type_id
      LEFT JOIN container_statuses  cs   ON cs.status_id = c.status_id
      LEFT JOIN cargo_types         ca   ON ca.cargo_type_id = c.cargo_type_id
      LEFT JOIN cargo_attributes    attr ON attr.attribute_id = c.attribute_id
      JOIN order_container oc ON oc.container_id = c.container_id
      JOIN orders o           ON o.order_id     = oc.order_id
      WHERE o.customer_id = ${opts.customerId}
      ORDER BY c.container_id ASC LIMIT ${opts.limit} OFFSET ${opts.offset}
    `;
  }
  return await db`
    SELECT c.container_id, c.manifest_id, c.container_type_id, ct.container_type_name,
           c.status_id, cs.status_name, c.cargo_type_id, ca.cargo_type_name,
           c.attribute_id, attr.attribute_name,
           c.gross_weight, c.declared_value, c.seal_number, c.note, c.created_at
    FROM container c
    LEFT JOIN container_types     ct   ON ct.container_type_id = c.container_type_id
    LEFT JOIN container_statuses  cs   ON cs.status_id = c.status_id
    LEFT JOIN cargo_types         ca   ON ca.cargo_type_id = c.cargo_type_id
    LEFT JOIN cargo_attributes    attr ON attr.attribute_id = c.attribute_id
    WHERE (${kw}::text IS NULL OR c.container_id ILIKE ${kw} OR c.seal_number ILIKE ${kw})
      AND (${opts.statusName ?? null}::text IS NULL OR cs.status_name = ${opts.statusName ?? null})
    ORDER BY c.container_id ASC LIMIT ${opts.limit} OFFSET ${opts.offset}
  `;
}

async function selectOne(id: string) {
  return await sql()`
    SELECT c.container_id, c.manifest_id, c.container_type_id, ct.container_type_name,
           c.status_id, cs.status_name, c.cargo_type_id, ca.cargo_type_name,
           c.attribute_id, attr.attribute_name,
           c.gross_weight, c.declared_value, c.seal_number, c.note, c.created_at
    FROM container c
    LEFT JOIN container_types     ct   ON ct.container_type_id = c.container_type_id
    LEFT JOIN container_statuses  cs   ON cs.status_id = c.status_id
    LEFT JOIN cargo_types         ca   ON ca.cargo_type_id = c.cargo_type_id
    LEFT JOIN cargo_attributes    attr ON attr.attribute_id = c.attribute_id
    WHERE c.container_id = ${id} LIMIT 1
  `;
}

async function countContainers(opts: { keyword?: string; statusName?: string; customerId?: number }) {
  const db = sql();
  const kw = opts.keyword ? `%${opts.keyword}%` : null;
  if (opts.customerId != null) {
    return (await db`
      SELECT COUNT(*)::int AS n FROM container c
      JOIN order_container oc ON oc.container_id = c.container_id
      JOIN orders o           ON o.order_id     = oc.order_id
      WHERE o.customer_id = ${opts.customerId}
    `)[0].n;
  }
  return (await db`
    SELECT COUNT(*)::int AS n FROM container c
    LEFT JOIN container_statuses cs ON cs.status_id = c.status_id
    WHERE (${kw}::text IS NULL OR c.container_id ILIKE ${kw} OR c.seal_number ILIKE ${kw})
      AND (${opts.statusName ?? null}::text IS NULL OR cs.status_name = ${opts.statusName ?? null})
  `)[0].n;
}

r.get('/admin/containers', authV1, STAFF, async (c) => {
  const pageNo = Math.max(0, Number(c.req.query('page') ?? 0));
  const pageSize = Math.min(200, Number(c.req.query('size') ?? 20));
  const keyword = (c.req.query('keyword') ?? '').trim() || undefined;
  const statusName = (c.req.query('statusName') ?? '').trim() || undefined;
  const total = await countContainers({ keyword, statusName });
  const rows = await selectContainers({ keyword, statusName, limit: pageSize, offset: pageNo * pageSize });
  const mapped = await enrichPosition(rows.map(mapContainer));
  return c.json(ok(page(mapped, pageNo, pageSize, total)));
});

r.get('/admin/containers/my', authV1, ANY, async (c) => {
  const u = c.get('user') as any;
  const pageNo = Math.max(0, Number(c.req.query('page') ?? 0));
  const pageSize = Math.min(200, Number(c.req.query('size') ?? 20));
  const total = await countContainers({ customerId: u.uid });
  const rows = await selectContainers({ customerId: u.uid, limit: pageSize, offset: pageNo * pageSize });
  const mapped = await enrichPosition(rows.map(mapContainer));
  return c.json(ok(page(mapped, pageNo, pageSize, total)));
});

r.get('/admin/containers/:id', authV1, STAFF, async (c) => {
  const id = c.req.param('id');
  const db = sql();
  const rows = await selectOne(id);
  if (rows.length === 0) return c.json(fail('Không tìm thấy container', 'NOT_FOUND'), 404);
  const mapped = await enrichPosition([mapContainer(rows[0])]);
  return c.json(ok(mapped[0]));
});

r.post('/admin/containers', authV1, ANY, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const id: string = (b.containerId ?? '').trim();
  if (!id) return c.json(fail('containerId bắt buộc', 'INVALID_INPUT'), 400);
  const db = sql();
  const dup = await db`SELECT 1 FROM container WHERE container_id = ${id}`;
  if (dup.length > 0) return c.json(fail('Container đã tồn tại', 'DUPLICATE'), 409);
  await db`
    INSERT INTO container (container_id, manifest_id, container_type_id, cargo_type_id, attribute_id,
                           gross_weight, declared_value, seal_number, note,
                           status_id)
    VALUES (${id}, ${b.manifestId ?? null}, ${b.containerTypeId ?? null}, ${b.cargoTypeId ?? null},
            ${b.attributeId ?? null}, ${b.grossWeight ?? null}, ${b.declaredValue ?? null},
            ${b.sealNumber ?? null}, ${b.note ?? null},
            (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE' LIMIT 1))
  `;
  const rows = await selectOne(id);
  return c.json(ok(mapContainer(rows[0]), 'Đã tạo container'), 201);
});

r.put('/admin/containers/:id', authV1, STAFF, async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json().catch(() => ({}));
  const db = sql();
  await db`
    UPDATE container SET
      container_type_id = COALESCE(${b.containerTypeId ?? null}, container_type_id),
      cargo_type_id     = COALESCE(${b.cargoTypeId ?? null}, cargo_type_id),
      attribute_id      = COALESCE(${b.attributeId ?? null}, attribute_id),
      gross_weight      = COALESCE(${b.grossWeight ?? null}, gross_weight),
      declared_value    = COALESCE(${b.declaredValue ?? null}, declared_value),
      seal_number       = COALESCE(${b.sealNumber ?? null}, seal_number),
      note              = COALESCE(${b.note ?? null}, note)
    WHERE container_id = ${id}
  `;
  const rows = await selectOne(id);
  if (rows.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(mapContainer(rows[0]), 'Đã cập nhật'));
});

r.get('/admin/containers/:id/status-history', authV1, STAFF, async (c) => {
  const id = c.req.param('id');
  const db = sql();
  const rows = await db`
    SELECT h.history_id, h.container_id, h.status_id, s.status_name, h.description, h.created_at
    FROM container_status_history h
    LEFT JOIN container_statuses s ON s.status_id = h.status_id
    WHERE h.container_id = ${id} ORDER BY h.history_id DESC
  `;
  return c.json(ok(rows));
});

r.put('/admin/containers/:id/export-priority', authV1, STAFF, async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json().catch(() => ({}));
  const lvl = Math.min(10, Math.max(1, Number(b.priorityLevel ?? 1)));
  const db = sql();
  await db`
    INSERT INTO export_priority (container_id, priority_level, note)
    VALUES (${id}, ${lvl}, ${b.note ?? null})
    ON CONFLICT (container_id) DO UPDATE
      SET priority_level = EXCLUDED.priority_level, note = EXCLUDED.note
  `;
  const rows = await db`
    SELECT priority_id, container_id, priority_level, note FROM export_priority WHERE container_id = ${id}
  `;
  return c.json(ok(rows[0], 'Đã đặt mức ưu tiên'));
});

r.get('/admin/containers/:id/export-priority', authV1, STAFF, async (c) => {
  const id = c.req.param('id');
  const db = sql();
  const rows = await db`
    SELECT priority_id, container_id, priority_level, note FROM export_priority WHERE container_id = ${id}
  `;
  if (rows.length === 0) return c.json(fail('Chưa có ưu tiên', 'NOT_FOUND'), 404);
  return c.json(ok(rows[0]));
});

r.delete('/admin/containers/:id', authV1, ADMIN_ONLY, async (c) => {
  const id = c.req.param('id');
  await tx(async (s: any) => {
    await s`DELETE FROM container_positions WHERE container_id = ${id}`;
    await s`DELETE FROM container_status_history WHERE container_id = ${id}`;
    await s`DELETE FROM export_priority WHERE container_id = ${id}`;
    await s`DELETE FROM order_container WHERE container_id = ${id}`;
    await s`DELETE FROM container WHERE container_id = ${id}`;
  });
  return c.json(ok(null, 'Đã xoá'));
});

r.put('/admin/containers/:id/repair', authV1, STAFF, async (c) => {
  const id = c.req.param('id');
  const db = sql();
  await db`
    UPDATE container SET status_id = (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE' LIMIT 1)
    WHERE container_id = ${id}
  `;
  await db`
    INSERT INTO container_status_history (container_id, status_id, description)
    VALUES (${id}, (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE' LIMIT 1), 'Repaired')
  `;
  const rows = await selectOne(id);
  return c.json(ok(mapContainer(rows[0]), 'Đã đánh dấu sửa xong'));
});

// ============================================================
// /admin/container-types  — catalog
// ============================================================
r.get('/admin/container-types', authV1, ANY, async () => {
  const db = sql();
  const rows = await db`SELECT container_type_id, container_type_name FROM container_types ORDER BY container_type_id`;
  return new Response(JSON.stringify(ok(rows)), { headers: { 'content-type': 'application/json' } });
});
r.post('/admin/container-types', authV1, ADMIN_ONLY, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const name = (b.containerTypeName ?? '').trim();
  if (!name) return c.json(fail('containerTypeName bắt buộc', 'INVALID_INPUT'), 400);
  const db = sql();
  const r = await db`INSERT INTO container_types (container_type_name) VALUES (${name}) RETURNING container_type_id, container_type_name`;
  return c.json(ok(r[0], 'Đã tạo'), 201);
});
r.put('/admin/container-types/:id', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => ({}));
  const db = sql();
  const r = await db`UPDATE container_types SET container_type_name = ${b.containerTypeName ?? ''} WHERE container_type_id = ${id} RETURNING container_type_id, container_type_name`;
  if (r.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(r[0]));
});
r.delete('/admin/container-types/:id', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('id'));
  await sql()`DELETE FROM container_types WHERE container_type_id = ${id}`;
  return c.json(ok(null, 'Đã xoá'));
});

// /admin/cargo-types
r.get('/admin/cargo-types', authV1, ANY, async () => {
  const rows = await sql()`SELECT cargo_type_id, cargo_type_name FROM cargo_types ORDER BY cargo_type_id`;
  return new Response(JSON.stringify(ok(rows)), { headers: { 'content-type': 'application/json' } });
});
r.post('/admin/cargo-types', authV1, ADMIN_ONLY, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const r = await sql()`INSERT INTO cargo_types (cargo_type_name) VALUES (${b.cargoTypeName ?? ''}) RETURNING cargo_type_id, cargo_type_name`;
  return c.json(ok(r[0]), 201);
});
r.put('/admin/cargo-types/:id', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => ({}));
  const r = await sql()`UPDATE cargo_types SET cargo_type_name = ${b.cargoTypeName ?? ''} WHERE cargo_type_id = ${id} RETURNING cargo_type_id, cargo_type_name`;
  if (r.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(r[0]));
});
r.delete('/admin/cargo-types/:id', authV1, ADMIN_ONLY, async (c) => {
  await sql()`DELETE FROM cargo_types WHERE cargo_type_id = ${Number(c.req.param('id'))}`;
  return c.json(ok(null));
});

// /admin/cargo-attributes
r.get('/admin/cargo-attributes', authV1, STAFF, async () => {
  const rows = await sql()`SELECT attribute_id, attribute_name FROM cargo_attributes ORDER BY attribute_id`;
  return new Response(JSON.stringify(ok(rows)), { headers: { 'content-type': 'application/json' } });
});
r.post('/admin/cargo-attributes', authV1, ADMIN_ONLY, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const r = await sql()`INSERT INTO cargo_attributes (attribute_name) VALUES (${b.attributeName ?? ''}) RETURNING attribute_id, attribute_name`;
  return c.json(ok(r[0]), 201);
});
r.put('/admin/cargo-attributes/:id', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => ({}));
  const r = await sql()`UPDATE cargo_attributes SET attribute_name = ${b.attributeName ?? ''} WHERE attribute_id = ${id} RETURNING attribute_id, attribute_name`;
  if (r.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(r[0]));
});
r.delete('/admin/cargo-attributes/:id', authV1, ADMIN_ONLY, async (c) => {
  await sql()`DELETE FROM cargo_attributes WHERE attribute_id = ${Number(c.req.param('id'))}`;
  return c.json(ok(null));
});

// /admin/container-statuses (read-only)
r.get('/admin/container-statuses', authV1, STAFF, async () => {
  const rows = await sql()`SELECT status_id, status_name FROM container_statuses ORDER BY status_id`;
  return new Response(JSON.stringify(ok(rows)), { headers: { 'content-type': 'application/json' } });
});

export default r;
