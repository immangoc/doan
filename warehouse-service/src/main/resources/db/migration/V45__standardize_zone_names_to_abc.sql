-- =============================================================
-- V45 - Standardize zone structure across all warehouses
--
-- Mục tiêu cấu trúc đồng nhất:
--   Kho hàng khô   - 3 zone (A/B/C), 4 tier
--   Kho hàng lạnh  - 3 zone (A/B/C), 4 tier
--   Kho hàng dễ vỡ - 3 zone (A/B/C), 4 tier
--   Kho khác       - 3 zone (A/B/C), 4 tier
--   Kho hỏng       - 2 zone (A/B),   1 tier
--
-- Mỗi zone có 1 block với grid 4 row × 8 bay = 32 slot.
--
-- Các bước
--   1. Wipe state (positions / receipts / yard_storage / status) cho mọi
--      container HTHU đang ở 5 kho.
--   2. Xoá zone A4 (Kho hàng khô) cùng block, slot, alert.
--   3. Đổi tên các zone hiện có thành Zone A / Zone B (A1->A, A2->B,
--      A3->C; B1->A, B2->B; C1->A, C2->B; E1->A; F1->A).
--   4. Update max_tier của Kho hàng dễ vỡ lên 4.
--   5. Tạo các zone, block, slot còn thiếu (Zone C cho 3 kho có sẵn dữ
--      liệu, full Zone A/B/C cho Kho khác, Zone A/B cho Kho hỏng).
--   6. Tái phân bổ container 4 cargo type vào kho tương ứng (Khô/Lạnh/
--      Dễ Vỡ/Khác) theo công thức rải đều block.
--   7. Recreate gate_in_receipt + yard_storage, set IN_YARD.
-- =============================================================
SET client_encoding = 'UTF8';

-- ─── 1. Wipe state cho 4 kho có container ────────────────────────────────────

DELETE FROM container_positions
WHERE container_id IN (
    SELECT c.container_id FROM container c
    LEFT JOIN yard_storage ys ON ys.container_id = c.container_id
    LEFT JOIN yards y ON ys.yard_id = y.yard_id
    WHERE c.container_id LIKE 'HTHU%'
      AND (y.yard_name IN ('Kho hàng khô', 'Kho hàng lạnh', 'Kho hàng dễ vỡ', 'Kho khác')
           OR ys.yard_id IS NULL)
);

DELETE FROM gate_in_receipt
WHERE container_id LIKE 'HTHU%';

DELETE FROM yard_storage
WHERE container_id LIKE 'HTHU%';

UPDATE container
SET status_id = (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE')
WHERE container_id LIKE 'HTHU%'
  AND cargo_type_id IN (
      SELECT cargo_type_id FROM cargo_types
      WHERE cargo_type_name IN ('Hàng Khô', 'Hàng Lạnh', 'Hàng Dễ Vỡ', 'Hàng Khác')
  );

-- ─── 2. Xoá zone A4 (Kho hàng khô) ──────────────────────────────────────────

DELETE FROM slots WHERE block_id IN (
    SELECT b.block_id FROM blocks b
    JOIN yard_zones yz ON b.zone_id  = yz.zone_id
    JOIN yards      y  ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng khô' AND yz.zone_name = 'A4'
);
DELETE FROM blocks WHERE zone_id IN (
    SELECT yz.zone_id FROM yard_zones yz
    JOIN yards y ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng khô' AND yz.zone_name = 'A4'
);
DELETE FROM alert WHERE zone_id IN (
    SELECT yz.zone_id FROM yard_zones yz
    JOIN yards y ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng khô' AND yz.zone_name = 'A4'
);
DELETE FROM yard_zones WHERE zone_id IN (
    SELECT yz.zone_id FROM yard_zones yz
    JOIN yards y ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng khô' AND yz.zone_name = 'A4'
);

-- ─── 3. Đổi tên các zone hiện có ────────────────────────────────────────────

UPDATE yard_zones SET zone_name = 'Zone A'
WHERE zone_name = 'A1' AND yard_id = (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng khô');
UPDATE yard_zones SET zone_name = 'Zone B'
WHERE zone_name = 'A2' AND yard_id = (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng khô');
UPDATE yard_zones SET zone_name = 'Zone C'
WHERE zone_name = 'A3' AND yard_id = (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng khô');

UPDATE yard_zones SET zone_name = 'Zone A'
WHERE zone_name = 'B1' AND yard_id = (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng lạnh');
UPDATE yard_zones SET zone_name = 'Zone B'
WHERE zone_name = 'B2' AND yard_id = (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng lạnh');

UPDATE yard_zones SET zone_name = 'Zone A'
WHERE zone_name = 'C1' AND yard_id = (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng dễ vỡ');
UPDATE yard_zones SET zone_name = 'Zone B'
WHERE zone_name = 'C2' AND yard_id = (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng dễ vỡ');

UPDATE yard_zones SET zone_name = 'Zone A'
WHERE zone_name = 'E1' AND yard_id = (SELECT yard_id FROM yards WHERE yard_name = 'Kho khác');

UPDATE yard_zones SET zone_name = 'Zone A'
WHERE zone_name = 'F1' AND yard_id = (SELECT yard_id FROM yards WHERE yard_name = 'Kho hỏng');

-- ─── 4. Nâng max_tier của Kho hàng dễ vỡ lên 4 ──────────────────────────────

UPDATE slots SET max_tier = 4
WHERE block_id IN (
    SELECT b.block_id FROM blocks b
    JOIN yard_zones yz ON b.zone_id  = yz.zone_id
    JOIN yards      y  ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng dễ vỡ'
);

-- ─── 5. Tạo các zone / block / slot còn thiếu ───────────────────────────────
--
-- Helper pattern (lặp lại cho từng kho): tạo zone nếu chưa có -> tạo 1 block
-- nếu zone đó chưa có block -> chèn 32 slot (4 row × 8 bay) nếu chưa có.

-- 5a. Kho hàng lạnh - Zone C (REEFER, max_tier 4) -----------------------------
INSERT INTO yard_zones (yard_id, zone_name, capacity_slots)
SELECT y.yard_id, 'Zone C', 96 FROM yards y
WHERE y.yard_name = 'Kho hàng lạnh'
  AND NOT EXISTS (SELECT 1 FROM yard_zones yz WHERE yz.yard_id = y.yard_id AND yz.zone_name = 'Zone C');

INSERT INTO blocks (zone_id, block_type_id, block_name)
SELECT yz.zone_id,
       (SELECT block_type_id FROM block_types WHERE block_type_name = 'REEFER'),
       'COLD-C-BLK1'
FROM yard_zones yz
JOIN yards y ON yz.yard_id = y.yard_id
WHERE y.yard_name = 'Kho hàng lạnh' AND yz.zone_name = 'Zone C'
  AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.zone_id = yz.zone_id);

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 4
FROM blocks b
JOIN yard_zones yz ON b.zone_id = yz.zone_id
JOIN yards      y  ON yz.yard_id = y.yard_id
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE y.yard_name = 'Kho hàng lạnh' AND yz.zone_name = 'Zone C'
  AND NOT EXISTS (
      SELECT 1 FROM slots s
      WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

-- 5b. Kho hàng dễ vỡ - Zone C (STANDARD, max_tier 4) -------------------------
INSERT INTO yard_zones (yard_id, zone_name, capacity_slots)
SELECT y.yard_id, 'Zone C', 96 FROM yards y
WHERE y.yard_name = 'Kho hàng dễ vỡ'
  AND NOT EXISTS (SELECT 1 FROM yard_zones yz WHERE yz.yard_id = y.yard_id AND yz.zone_name = 'Zone C');

INSERT INTO blocks (zone_id, block_type_id, block_name)
SELECT yz.zone_id,
       (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'),
       'FRAGILE-C-BLK1'
FROM yard_zones yz
JOIN yards y ON yz.yard_id = y.yard_id
WHERE y.yard_name = 'Kho hàng dễ vỡ' AND yz.zone_name = 'Zone C'
  AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.zone_id = yz.zone_id);

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 4
FROM blocks b
JOIN yard_zones yz ON b.zone_id = yz.zone_id
JOIN yards      y  ON yz.yard_id = y.yard_id
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE y.yard_name = 'Kho hàng dễ vỡ' AND yz.zone_name = 'Zone C'
  AND NOT EXISTS (
      SELECT 1 FROM slots s
      WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

-- 5c. Kho khác - Zone A (block + slots), Zone B, Zone C (STANDARD, tier 4) ---
-- Zone A đã đổi tên từ E1 nhưng chưa có block/slot, bổ sung trước.
INSERT INTO blocks (zone_id, block_type_id, block_name)
SELECT yz.zone_id,
       (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'),
       'OTHER-A-BLK1'
FROM yard_zones yz
JOIN yards y ON yz.yard_id = y.yard_id
WHERE y.yard_name = 'Kho khác' AND yz.zone_name = 'Zone A'
  AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.zone_id = yz.zone_id);

-- Zone B + Zone C
INSERT INTO yard_zones (yard_id, zone_name, capacity_slots)
SELECT y.yard_id, z.zone_name, 96
FROM yards y
CROSS JOIN (VALUES ('Zone B'), ('Zone C')) AS z(zone_name)
WHERE y.yard_name = 'Kho khác'
  AND NOT EXISTS (
      SELECT 1 FROM yard_zones yz
      WHERE yz.yard_id = y.yard_id AND yz.zone_name = z.zone_name
  );

INSERT INTO blocks (zone_id, block_type_id, block_name)
SELECT yz.zone_id,
       (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'),
       'OTHER-' || RIGHT(yz.zone_name, 1) || '-BLK1'
FROM yard_zones yz
JOIN yards y ON yz.yard_id = y.yard_id
WHERE y.yard_name = 'Kho khác' AND yz.zone_name IN ('Zone B', 'Zone C')
  AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.zone_id = yz.zone_id);

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 4
FROM blocks b
JOIN yard_zones yz ON b.zone_id = yz.zone_id
JOIN yards      y  ON yz.yard_id = y.yard_id
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE y.yard_name = 'Kho khác' AND yz.zone_name IN ('Zone A', 'Zone B', 'Zone C')
  AND NOT EXISTS (
      SELECT 1 FROM slots s
      WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

-- 5d. Kho hỏng - Zone A (block + slots), Zone B (STANDARD, tier 1) ----------
INSERT INTO blocks (zone_id, block_type_id, block_name)
SELECT yz.zone_id,
       (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'),
       'DAMAGED-A-BLK1'
FROM yard_zones yz
JOIN yards y ON yz.yard_id = y.yard_id
WHERE y.yard_name = 'Kho hỏng' AND yz.zone_name = 'Zone A'
  AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.zone_id = yz.zone_id);

INSERT INTO yard_zones (yard_id, zone_name, capacity_slots)
SELECT y.yard_id, 'Zone B', 24
FROM yards y
WHERE y.yard_name = 'Kho hỏng'
  AND NOT EXISTS (
      SELECT 1 FROM yard_zones yz
      WHERE yz.yard_id = y.yard_id AND yz.zone_name = 'Zone B'
  );

INSERT INTO blocks (zone_id, block_type_id, block_name)
SELECT yz.zone_id,
       (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'),
       'DAMAGED-B-BLK1'
FROM yard_zones yz
JOIN yards y ON yz.yard_id = y.yard_id
WHERE y.yard_name = 'Kho hỏng' AND yz.zone_name = 'Zone B'
  AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.zone_id = yz.zone_id);

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 1
FROM blocks b
JOIN yard_zones yz ON b.zone_id = yz.zone_id
JOIN yards      y  ON yz.yard_id = y.yard_id
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE y.yard_name = 'Kho hỏng' AND yz.zone_name IN ('Zone A', 'Zone B')
  AND NOT EXISTS (
      SELECT 1 FROM slots s
      WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

-- ─── 6. Tái phân bổ container vào 4 kho theo cargo type ─────────────────────
--
-- Mỗi kho giờ có 3 zone × 32 slot = 96 vị trí/tier; max_tier 4 -> 384 capacity.
-- 250 container/kho rải đều thành tier 1-3 (phần dư ở tier 3 nửa kho).

-- Kho hàng khô
WITH pool AS (
    SELECT c.container_id, ROW_NUMBER() OVER (ORDER BY c.container_id) - 1 AS idx
    FROM container c
    WHERE c.container_id LIKE 'HTHU%'
      AND c.cargo_type_id = (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô')
      AND c.status_id     = (SELECT status_id    FROM container_statuses WHERE status_name = 'AVAILABLE')
),
yard_slots AS (
    SELECT s.slot_id, s.max_tier,
           ROW_NUMBER() OVER (ORDER BY yz.zone_name, b.block_name, s.row_no, s.bay_no) - 1 AS slot_idx,
           COUNT(*) OVER () AS slot_total
    FROM slots s
    JOIN blocks     b  ON s.block_id = b.block_id
    JOIN yard_zones yz ON b.zone_id  = yz.zone_id
    JOIN yards      y  ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng khô'
)
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
SELECT p.container_id, ys.slot_id, (p.idx / ys.slot_total) + 1, NOW()
FROM pool p
JOIN yard_slots ys ON ys.slot_idx = p.idx % ys.slot_total
WHERE (p.idx / ys.slot_total) + 1 <= ys.max_tier
ON CONFLICT (container_id) DO NOTHING;

-- Kho hàng lạnh
WITH pool AS (
    SELECT c.container_id, ROW_NUMBER() OVER (ORDER BY c.container_id) - 1 AS idx
    FROM container c
    WHERE c.container_id LIKE 'HTHU%'
      AND c.cargo_type_id = (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh')
      AND c.status_id     = (SELECT status_id    FROM container_statuses WHERE status_name = 'AVAILABLE')
),
yard_slots AS (
    SELECT s.slot_id, s.max_tier,
           ROW_NUMBER() OVER (ORDER BY yz.zone_name, b.block_name, s.row_no, s.bay_no) - 1 AS slot_idx,
           COUNT(*) OVER () AS slot_total
    FROM slots s
    JOIN blocks     b  ON s.block_id = b.block_id
    JOIN yard_zones yz ON b.zone_id  = yz.zone_id
    JOIN yards      y  ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng lạnh'
)
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
SELECT p.container_id, ys.slot_id, (p.idx / ys.slot_total) + 1, NOW()
FROM pool p
JOIN yard_slots ys ON ys.slot_idx = p.idx % ys.slot_total
WHERE (p.idx / ys.slot_total) + 1 <= ys.max_tier
ON CONFLICT (container_id) DO NOTHING;

-- Kho hàng dễ vỡ
WITH pool AS (
    SELECT c.container_id, ROW_NUMBER() OVER (ORDER BY c.container_id) - 1 AS idx
    FROM container c
    WHERE c.container_id LIKE 'HTHU%'
      AND c.cargo_type_id = (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Dễ Vỡ')
      AND c.status_id     = (SELECT status_id    FROM container_statuses WHERE status_name = 'AVAILABLE')
),
yard_slots AS (
    SELECT s.slot_id, s.max_tier,
           ROW_NUMBER() OVER (ORDER BY yz.zone_name, b.block_name, s.row_no, s.bay_no) - 1 AS slot_idx,
           COUNT(*) OVER () AS slot_total
    FROM slots s
    JOIN blocks     b  ON s.block_id = b.block_id
    JOIN yard_zones yz ON b.zone_id  = yz.zone_id
    JOIN yards      y  ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng dễ vỡ'
)
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
SELECT p.container_id, ys.slot_id, (p.idx / ys.slot_total) + 1, NOW()
FROM pool p
JOIN yard_slots ys ON ys.slot_idx = p.idx % ys.slot_total
WHERE (p.idx / ys.slot_total) + 1 <= ys.max_tier
ON CONFLICT (container_id) DO NOTHING;

-- Kho khác
WITH pool AS (
    SELECT c.container_id, ROW_NUMBER() OVER (ORDER BY c.container_id) - 1 AS idx
    FROM container c
    WHERE c.container_id LIKE 'HTHU%'
      AND c.cargo_type_id = (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khác')
      AND c.status_id     = (SELECT status_id    FROM container_statuses WHERE status_name = 'AVAILABLE')
),
yard_slots AS (
    SELECT s.slot_id, s.max_tier,
           ROW_NUMBER() OVER (ORDER BY yz.zone_name, b.block_name, s.row_no, s.bay_no) - 1 AS slot_idx,
           COUNT(*) OVER () AS slot_total
    FROM slots s
    JOIN blocks     b  ON s.block_id = b.block_id
    JOIN yard_zones yz ON b.zone_id  = yz.zone_id
    JOIN yards      y  ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho khác'
)
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
SELECT p.container_id, ys.slot_id, (p.idx / ys.slot_total) + 1, NOW()
FROM pool p
JOIN yard_slots ys ON ys.slot_idx = p.idx % ys.slot_total
WHERE (p.idx / ys.slot_total) + 1 <= ys.max_tier
ON CONFLICT (container_id) DO NOTHING;

-- ─── 7. Tái tạo gate_in_receipt + yard_storage và set IN_YARD ──────────────

INSERT INTO gate_in_receipt (container_id, gate_in_time, note)
SELECT c.container_id, c.created_at, 'Tự động tái nhập kho - ' || c.container_id
FROM container c
WHERE c.container_id LIKE 'HTHU%'
  AND EXISTS (SELECT 1 FROM container_positions cp WHERE cp.container_id = c.container_id)
  AND NOT EXISTS (SELECT 1 FROM gate_in_receipt g  WHERE g.container_id  = c.container_id);

INSERT INTO yard_storage (container_id, yard_id, storage_start_date, note)
SELECT c.container_id,
       CASE
           WHEN ct.cargo_type_name = 'Hàng Khô'   THEN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng khô')
           WHEN ct.cargo_type_name = 'Hàng Lạnh'  THEN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng lạnh')
           WHEN ct.cargo_type_name = 'Hàng Dễ Vỡ' THEN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng dễ vỡ')
           ELSE                                          (SELECT yard_id FROM yards WHERE yard_name = 'Kho khác')
       END,
       c.created_at::DATE,
       'Tự động tái nhập kho - ' || c.container_id
FROM container c
JOIN cargo_types ct ON c.cargo_type_id = ct.cargo_type_id
WHERE c.container_id LIKE 'HTHU%'
  AND EXISTS (SELECT 1 FROM container_positions cp WHERE cp.container_id = c.container_id)
  AND NOT EXISTS (SELECT 1 FROM yard_storage ys WHERE ys.container_id = c.container_id);

UPDATE container
SET status_id = (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD')
WHERE container_id LIKE 'HTHU%'
  AND status_id = (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE')
  AND container_id IN (SELECT container_id FROM container_positions);
