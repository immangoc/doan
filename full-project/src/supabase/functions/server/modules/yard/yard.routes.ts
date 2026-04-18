// Yard module — port từ YardController + SlotController + RelocationController
// Mount: /admin/yards, /admin/zones, /admin/blocks, /admin/slots, /admin/yard, /admin/yard-types, /admin/block-types
import { Hono } from 'npm:hono';
import { sql, tx } from '../../db.ts';
import { ok, fail } from '../../common/response.ts';
import { authV1, requireRoles } from '../../common/auth-v1.ts';

const r = new Hono();
const STAFF = requireRoles('ADMIN', 'OPERATOR');
const ADMIN_ONLY = requireRoles('ADMIN');

// ============================================================
// Reference data
// ============================================================
r.get('/admin/yard-types', authV1, STAFF, async () => {
  const rows = await sql()`SELECT yard_type_id, yard_type_name FROM yard_types ORDER BY yard_type_id`;
  return new Response(JSON.stringify(ok(rows)), { headers: { 'content-type': 'application/json' } });
});
r.get('/admin/block-types', authV1, STAFF, async () => {
  const rows = await sql()`SELECT block_type_id, block_type_name FROM block_types ORDER BY block_type_id`;
  return new Response(JSON.stringify(ok(rows)), { headers: { 'content-type': 'application/json' } });
});

// ============================================================
// Yards
// ============================================================
r.get('/admin/yards', authV1, STAFF, async () => {
  const rows = await sql()`
    SELECT y.yard_id, y.yard_name, y.address, y.yard_type_id, t.yard_type_name
    FROM yards y LEFT JOIN yard_types t ON t.yard_type_id = y.yard_type_id
    ORDER BY y.yard_id
  `;
  return new Response(JSON.stringify(ok(rows)), { headers: { 'content-type': 'application/json' } });
});

r.get('/admin/yards/:id', authV1, STAFF, async (c) => {
  const id = Number(c.req.param('id'));
  const rows = await sql()`
    SELECT y.yard_id, y.yard_name, y.address, y.yard_type_id, t.yard_type_name
    FROM yards y LEFT JOIN yard_types t ON t.yard_type_id = y.yard_type_id
    WHERE y.yard_id = ${id}
  `;
  if (rows.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(rows[0]));
});

r.post('/admin/yards', authV1, ADMIN_ONLY, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (!b.yardName || !b.yardTypeId) return c.json(fail('yardName + yardTypeId bắt buộc', 'INVALID_INPUT'), 400);
  const r2 = await sql()`
    INSERT INTO yards (yard_type_id, yard_name, address)
    VALUES (${b.yardTypeId}, ${b.yardName}, ${b.address ?? null})
    RETURNING yard_id, yard_name, address, yard_type_id
  `;
  return c.json(ok(r2[0], 'Đã tạo yard'), 201);
});

r.put('/admin/yards/:id', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => ({}));
  const r2 = await sql()`
    UPDATE yards SET
      yard_type_id = COALESCE(${b.yardTypeId ?? null}, yard_type_id),
      yard_name    = COALESCE(${b.yardName ?? null}, yard_name),
      address      = COALESCE(${b.address ?? null}, address)
    WHERE yard_id = ${id}
    RETURNING yard_id, yard_name, address, yard_type_id
  `;
  if (r2.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(r2[0]));
});

r.delete('/admin/yards/:id', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('id'));
  await sql()`DELETE FROM yards WHERE yard_id = ${id}`;
  return c.json(ok(null, 'Đã xoá yard'));
});

// ============================================================
// Zones
// ============================================================
r.get('/admin/yards/:yardId/zones', authV1, STAFF, async (c) => {
  const yardId = Number(c.req.param('yardId'));
  const rows = await sql()`
    SELECT zone_id, yard_id, zone_name, capacity_slots
    FROM yard_zones WHERE yard_id = ${yardId} ORDER BY zone_id
  `;
  return c.json(ok(rows));
});

r.get('/admin/zones/:id', authV1, STAFF, async (c) => {
  const id = Number(c.req.param('id'));
  const rows = await sql()`SELECT zone_id, yard_id, zone_name, capacity_slots FROM yard_zones WHERE zone_id = ${id}`;
  if (rows.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(rows[0]));
});

r.post('/admin/yards/:yardId/zones', authV1, ADMIN_ONLY, async (c) => {
  const yardId = Number(c.req.param('yardId'));
  const b = await c.req.json().catch(() => ({}));
  if (!b.zoneName || !b.capacitySlots) return c.json(fail('zoneName + capacitySlots bắt buộc', 'INVALID_INPUT'), 400);
  const r2 = await sql()`
    INSERT INTO yard_zones (yard_id, zone_name, capacity_slots)
    VALUES (${yardId}, ${b.zoneName}, ${b.capacitySlots})
    RETURNING zone_id, yard_id, zone_name, capacity_slots
  `;
  return c.json(ok(r2[0], 'Đã tạo zone'), 201);
});

r.put('/admin/zones/:id', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => ({}));
  const r2 = await sql()`
    UPDATE yard_zones SET
      zone_name      = COALESCE(${b.zoneName ?? null}, zone_name),
      capacity_slots = COALESCE(${b.capacitySlots ?? null}, capacity_slots)
    WHERE zone_id = ${id}
    RETURNING zone_id, yard_id, zone_name, capacity_slots
  `;
  if (r2.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(r2[0]));
});

r.delete('/admin/zones/:id', authV1, ADMIN_ONLY, async (c) => {
  await sql()`DELETE FROM yard_zones WHERE zone_id = ${Number(c.req.param('id'))}`;
  return c.json(ok(null, 'Đã xoá zone'));
});

// ============================================================
// Blocks
// ============================================================
r.get('/admin/zones/:zoneId/blocks', authV1, STAFF, async (c) => {
  const zoneId = Number(c.req.param('zoneId'));
  const rows = await sql()`
    SELECT b.block_id, b.zone_id, b.block_name, b.block_type_id, t.block_type_name
    FROM blocks b LEFT JOIN block_types t ON t.block_type_id = b.block_type_id
    WHERE b.zone_id = ${zoneId} ORDER BY b.block_id
  `;
  return c.json(ok(rows));
});

r.get('/admin/blocks/:id', authV1, STAFF, async (c) => {
  const id = Number(c.req.param('id'));
  const rows = await sql()`
    SELECT b.block_id, b.zone_id, b.block_name, b.block_type_id, t.block_type_name
    FROM blocks b LEFT JOIN block_types t ON t.block_type_id = b.block_type_id
    WHERE b.block_id = ${id}
  `;
  if (rows.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(rows[0]));
});

r.post('/admin/zones/:zoneId/blocks', authV1, ADMIN_ONLY, async (c) => {
  const zoneId = Number(c.req.param('zoneId'));
  const b = await c.req.json().catch(() => ({}));
  if (!b.blockName) return c.json(fail('blockName bắt buộc', 'INVALID_INPUT'), 400);
  const r2 = await sql()`
    INSERT INTO blocks (zone_id, block_type_id, block_name)
    VALUES (${zoneId}, ${b.blockTypeId ?? null}, ${b.blockName})
    RETURNING block_id, zone_id, block_name, block_type_id
  `;
  return c.json(ok(r2[0], 'Đã tạo block'), 201);
});

r.put('/admin/blocks/:id', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => ({}));
  const r2 = await sql()`
    UPDATE blocks SET
      block_name    = COALESCE(${b.blockName ?? null}, block_name),
      block_type_id = COALESCE(${b.blockTypeId ?? null}, block_type_id)
    WHERE block_id = ${id}
    RETURNING block_id, zone_id, block_name, block_type_id
  `;
  if (r2.length === 0) return c.json(fail('Không tìm thấy', 'NOT_FOUND'), 404);
  return c.json(ok(r2[0]));
});

r.delete('/admin/blocks/:id', authV1, ADMIN_ONLY, async (c) => {
  await sql()`DELETE FROM blocks WHERE block_id = ${Number(c.req.param('id'))}`;
  return c.json(ok(null, 'Đã xoá block'));
});

// ============================================================
// Slots — CRUD + batch + lock/unlock
// ============================================================
r.get('/admin/blocks/:blockId/slots', authV1, STAFF, async (c) => {
  const blockId = Number(c.req.param('blockId'));
  const rows = await sql()`
    SELECT slot_id, block_id, row_no, bay_no, max_tier, is_locked, lock_reason
    FROM slots WHERE block_id = ${blockId} ORDER BY row_no, bay_no
  `;
  return c.json(ok(rows));
});

r.get('/admin/slots/:id', authV1, STAFF, async (c) => {
  const id = Number(c.req.param('id'));
  const rows = await sql()`
    SELECT slot_id, block_id, row_no, bay_no, max_tier, is_locked, lock_reason
    FROM slots WHERE slot_id = ${id}
  `;
  if (rows.length === 0) return c.json(fail('Không tìm thấy slot', 'SLOT_NOT_FOUND'), 404);
  return c.json(ok(rows[0]));
});

r.post('/admin/blocks/:blockId/slots', authV1, ADMIN_ONLY, async (c) => {
  const blockId = Number(c.req.param('blockId'));
  const b = await c.req.json().catch(() => ({}));
  if (!b.rowNo || !b.bayNo) return c.json(fail('rowNo + bayNo bắt buộc', 'INVALID_INPUT'), 400);
  const r2 = await sql()`
    INSERT INTO slots (block_id, row_no, bay_no, max_tier)
    VALUES (${blockId}, ${b.rowNo}, ${b.bayNo}, ${b.maxTier ?? 5})
    RETURNING slot_id, block_id, row_no, bay_no, max_tier
  `;
  return c.json(ok(r2[0], 'Đã tạo slot'), 201);
});

r.post('/admin/blocks/:blockId/slots/batch', authV1, ADMIN_ONLY, async (c) => {
  const blockId = Number(c.req.param('blockId'));
  const b = await c.req.json().catch(() => ({}));
  const rows = Math.max(1, Number(b.rows ?? 0));
  const bays = Math.max(1, Number(b.bays ?? 0));
  const maxTier = Math.max(1, Number(b.maxTier ?? 5));
  if (!rows || !bays) return c.json(fail('rows + bays bắt buộc', 'INVALID_INPUT'), 400);

  let created = 0;
  await tx(async (s: any) => {
    for (let row = 1; row <= rows; row++) {
      for (let bay = 1; bay <= bays; bay++) {
        const dup = await s`SELECT 1 FROM slots WHERE block_id = ${blockId} AND row_no = ${row} AND bay_no = ${bay}`;
        if (dup.length === 0) {
          await s`INSERT INTO slots (block_id, row_no, bay_no, max_tier) VALUES (${blockId}, ${row}, ${bay}, ${maxTier})`;
          created++;
        }
      }
    }
  });
  return c.json(ok({ created }, `Đã tạo ${created} slot`), 201);
});

r.put('/admin/slots/:id', authV1, ADMIN_ONLY, async (c) => {
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => ({}));
  const r2 = await sql()`
    UPDATE slots SET
      row_no   = COALESCE(${b.rowNo ?? null}, row_no),
      bay_no   = COALESCE(${b.bayNo ?? null}, bay_no),
      max_tier = COALESCE(${b.maxTier ?? null}, max_tier)
    WHERE slot_id = ${id}
    RETURNING slot_id, block_id, row_no, bay_no, max_tier, is_locked, lock_reason
  `;
  if (r2.length === 0) return c.json(fail('Không tìm thấy slot', 'NOT_FOUND'), 404);
  return c.json(ok(r2[0]));
});

r.delete('/admin/slots/:id', authV1, ADMIN_ONLY, async (c) => {
  await sql()`DELETE FROM slots WHERE slot_id = ${Number(c.req.param('id'))}`;
  return c.json(ok(null, 'Đã xoá slot'));
});

// ── Lock / Unlock ──────────────────────────────────────────────
r.put('/admin/slots/:slotId/lock', authV1, STAFF, async (c) => {
  const id = Number(c.req.param('slotId'));
  const b = await c.req.json().catch(() => ({}));
  const r2 = await sql()`
    UPDATE slots SET is_locked = TRUE, lock_reason = ${b.reason ?? null}
    WHERE slot_id = ${id}
    RETURNING slot_id, row_no, bay_no, max_tier, is_locked, lock_reason
  `;
  if (r2.length === 0) return c.json(fail('Không tìm thấy slot', 'SLOT_NOT_FOUND'), 404);
  return c.json(ok(r2[0], 'Đã khoá slot'));
});

r.put('/admin/slots/:slotId/unlock', authV1, STAFF, async (c) => {
  const id = Number(c.req.param('slotId'));
  const r2 = await sql()`
    UPDATE slots SET is_locked = FALSE, lock_reason = NULL
    WHERE slot_id = ${id}
    RETURNING slot_id, row_no, bay_no, max_tier, is_locked, lock_reason
  `;
  if (r2.length === 0) return c.json(fail('Không tìm thấy slot', 'SLOT_NOT_FOUND'), 404);
  return c.json(ok(r2[0], 'Đã mở khoá slot'));
});

// ============================================================
// Relocation — relocate / swap (transactional)
// ============================================================
r.post('/admin/yard/relocate', authV1, STAFF, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const containerId: string = (b.containerId ?? '').trim();
  const targetSlotId = Number(b.targetSlotId);
  const targetTier = Number(b.targetTier);
  if (!containerId || !targetSlotId || !targetTier) {
    return c.json(fail('containerId + targetSlotId + targetTier bắt buộc', 'INVALID_INPUT'), 400);
  }

  try {
    const result = await tx(async (s: any) => {
      const pos = await s`
        SELECT position_id, slot_id, tier FROM container_positions
        WHERE container_id = ${containerId} FOR UPDATE
      `;
      if (pos.length === 0) throw { code: 'NOT_FOUND', msg: `Container chưa có vị trí: ${containerId}` };
      const fromSlotId = pos[0].slot_id;
      if (fromSlotId === targetSlotId && pos[0].tier === targetTier) {
        throw { code: 'BAD_REQUEST', msg: 'Container đã ở slot/tier này' };
      }
      const slot = await s`SELECT slot_id, max_tier, is_locked FROM slots WHERE slot_id = ${targetSlotId}`;
      if (slot.length === 0) throw { code: 'SLOT_NOT_FOUND', msg: `Slot không tồn tại: ${targetSlotId}` };
      if (slot[0].is_locked) throw { code: 'SLOT_LOCKED', msg: 'Slot đang bị khoá' };
      if (targetTier > slot[0].max_tier) throw { code: 'BAD_REQUEST', msg: `Tier ${targetTier} vượt max ${slot[0].max_tier}` };
      const occupied = await s`SELECT COUNT(*)::int AS n FROM container_positions WHERE slot_id = ${targetSlotId} AND tier = ${targetTier}`;
      if (occupied[0].n > 0) throw { code: 'SLOT_OCCUPIED', msg: `Tier ${targetTier} ở slot ${targetSlotId} đã có container` };
      const upd = await s`
        UPDATE container_positions
        SET slot_id = ${targetSlotId}, tier = ${targetTier}, updated_at = NOW()
        WHERE position_id = ${pos[0].position_id}
        RETURNING updated_at
      `;
      return { containerId, fromSlotId, toSlotId: targetSlotId, tier: targetTier, updatedAt: upd[0].updated_at };
    });
    return c.json(ok(result, 'Đã di chuyển container'));
  } catch (e: any) {
    if (e?.code) return c.json(fail(e.msg, e.code), e.code === 'NOT_FOUND' || e.code === 'SLOT_NOT_FOUND' ? 404 : 400);
    throw e;
  }
});

r.post('/admin/yard/swap', authV1, STAFF, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const idA: string = (b.containerIdA ?? '').trim();
  const idB: string = (b.containerIdB ?? '').trim();
  if (!idA || !idB) return c.json(fail('containerIdA + containerIdB bắt buộc', 'INVALID_INPUT'), 400);
  if (idA.toLowerCase() === idB.toLowerCase()) return c.json(fail('Không thể hoán đổi cùng 1 container', 'BAD_REQUEST'), 400);

  try {
    const result = await tx(async (s: any) => {
      const a = await s`SELECT position_id, slot_id, tier FROM container_positions WHERE container_id = ${idA} FOR UPDATE`;
      const bb = await s`SELECT position_id, slot_id, tier FROM container_positions WHERE container_id = ${idB} FOR UPDATE`;
      if (a.length === 0) throw { code: 'NOT_FOUND', msg: `Container chưa có vị trí: ${idA}` };
      if (bb.length === 0) throw { code: 'NOT_FOUND', msg: `Container chưa có vị trí: ${idB}` };
      await s`UPDATE container_positions SET slot_id = ${bb[0].slot_id}, tier = ${bb[0].tier}, updated_at = NOW() WHERE position_id = ${a[0].position_id}`;
      await s`UPDATE container_positions SET slot_id = ${a[0].slot_id}, tier = ${a[0].tier}, updated_at = NOW() WHERE position_id = ${bb[0].position_id}`;
      return {
        containerIdA: idA, containerANewSlotId: bb[0].slot_id, containerANewTier: bb[0].tier,
        containerIdB: idB, containerBNewSlotId: a[0].slot_id, containerBNewTier: a[0].tier,
      };
    });
    return c.json(ok(result, 'Đã hoán đổi vị trí'));
  } catch (e: any) {
    if (e?.code) return c.json(fail(e.msg, e.code), e.code === 'NOT_FOUND' ? 404 : 400);
    throw e;
  }
});

export default r;
