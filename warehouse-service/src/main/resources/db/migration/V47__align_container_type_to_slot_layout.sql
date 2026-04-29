-- =============================================================
-- V47 - Re-place containers theo layout rules đã chốt
--
-- Quy ước:
--   bay 1-4 (cột trái):           20FT, mọi tier (stack thẳng)
--   bay 5-8 (cột phải) tier 1:    40FT, chỉ ở anchor row (row lẻ: 1, 3),
--                                 vì 1 container 40FT spans 2 rows
--   bay 5-8 (cột phải) tier 2+:   20FT, mọi row (2 cái stack trên 1 anchor 40FT)
--
-- Implementation:
--   1. Wipe positions/storage/gate-in-receipt cho HTHU containers
--   2. Status -> AVAILABLE
--   3. Build typed-slot inventory (slot_id, tier, expected_type)
--   4. Map containers vào typed slots theo cargo type → yard
--   5. Update container.container_type_id để khớp slot type
--   6. Recreate gate_in_receipt + yard_storage, set status IN_YARD
-- =============================================================
SET client_encoding = 'UTF8';

-- ─── 1. Wipe state cho 4 kho — bỏ qua container đang ở Kho hỏng ────────────

DELETE FROM container_positions
WHERE container_id IN (
    SELECT c.container_id FROM container c
    JOIN container_statuses cs ON c.status_id = cs.status_id
    WHERE c.container_id LIKE 'HTHU%'
      AND cs.status_name NOT IN ('DAMAGED', 'DAMAGED_PENDING')
);

DELETE FROM gate_in_receipt
WHERE container_id IN (
    SELECT c.container_id FROM container c
    JOIN container_statuses cs ON c.status_id = cs.status_id
    WHERE c.container_id LIKE 'HTHU%'
      AND cs.status_name NOT IN ('DAMAGED', 'DAMAGED_PENDING')
);

DELETE FROM yard_storage
WHERE container_id IN (
    SELECT c.container_id FROM container c
    JOIN container_statuses cs ON c.status_id = cs.status_id
    WHERE c.container_id LIKE 'HTHU%'
      AND cs.status_name NOT IN ('DAMAGED', 'DAMAGED_PENDING')
);

UPDATE container
SET status_id = (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE')
WHERE container_id LIKE 'HTHU%'
  AND status_id NOT IN (
      SELECT status_id FROM container_statuses
      WHERE status_name IN ('DAMAGED', 'DAMAGED_PENDING')
  );

-- ─── 2. Re-place containers theo typed-slot inventory ───────────────────────
--
-- Mỗi cargo type có 1 yard tương ứng. Trong yard đó, slots được expand thành
-- (slot_id, tier) với expected_type theo quy ước, rồi gán tuần tự cho
-- containers cùng cargo type.

WITH base_grid AS (
    SELECT
        s.slot_id, s.row_no, s.bay_no,
        b.block_name, y.yard_id, y.yard_name,
        yt.yard_type_name,
        t.tier,
        CASE
            WHEN s.bay_no <= 4 THEN '20FT'
            WHEN s.bay_no >= 5 AND t.tier = 1 AND (s.row_no % 2 = 1) THEN '40FT'
            WHEN s.bay_no >= 5 AND t.tier >  1 THEN '20FT'
            ELSE NULL  -- bay 5-8 tier 1 row chẵn → continuation, không dùng
        END AS slot_type
    FROM slots s
    JOIN blocks b ON s.block_id = b.block_id
    JOIN yard_zones yz ON b.zone_id = yz.zone_id
    JOIN yards y ON yz.yard_id = y.yard_id
    JOIN yard_types yt ON y.yard_type_id = yt.yard_type_id
    CROSS JOIN generate_series(1, 4) AS t(tier)
    WHERE t.tier <= s.max_tier
      AND y.yard_name IN ('Kho hàng khô', 'Kho hàng lạnh', 'Kho hàng dễ vỡ', 'Kho khác')
),
typed_slots AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY yard_id
               ORDER BY block_name, tier, bay_no, row_no
           ) AS slot_idx,
           COUNT(*) OVER (PARTITION BY yard_id) AS yard_slot_total
    FROM base_grid
    WHERE slot_type IS NOT NULL
),
typed_pool AS (
    SELECT
        c.container_id,
        ct.cargo_type_name,
        ROW_NUMBER() OVER (
            PARTITION BY ct.cargo_type_name
            ORDER BY c.container_id
        ) - 1 AS container_idx
    FROM container c
    JOIN cargo_types ct        ON c.cargo_type_id = ct.cargo_type_id
    JOIN container_statuses cs ON c.status_id    = cs.status_id
    WHERE c.container_id LIKE 'HTHU%'
      AND ct.cargo_type_name IN ('Hàng Khô', 'Hàng Lạnh', 'Hàng Dễ Vỡ', 'Hàng Khác')
      AND cs.status_name = 'AVAILABLE'   -- chỉ re-place container vừa được wipe
),
plan AS (
    SELECT
        tp.container_id,
        ts.slot_id,
        ts.tier,
        ts.slot_type
    FROM typed_pool tp
    JOIN typed_slots ts
      ON ts.yard_name = CASE tp.cargo_type_name
                            WHEN 'Hàng Khô'   THEN 'Kho hàng khô'
                            WHEN 'Hàng Lạnh'  THEN 'Kho hàng lạnh'
                            WHEN 'Hàng Dễ Vỡ' THEN 'Kho hàng dễ vỡ'
                            WHEN 'Hàng Khác'  THEN 'Kho khác'
                        END
     AND ts.slot_idx = (tp.container_idx % ts.yard_slot_total) + 1
)
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
SELECT container_id, slot_id, tier, NOW()
FROM plan
ON CONFLICT (container_id) DO NOTHING;

-- ─── 3. Update container.container_type_id khớp slot_type ───────────────────

UPDATE container c
SET container_type_id = (
    SELECT ct.container_type_id
    FROM container_positions cp
    JOIN slots s ON cp.slot_id = s.slot_id
    JOIN container_types ct ON ct.container_type_name =
        CASE
            WHEN s.bay_no <= 4 THEN '20FT'
            WHEN s.bay_no >= 5 AND cp.tier = 1 AND (s.row_no % 2 = 1) THEN '40FT'
            ELSE '20FT'
        END
    WHERE cp.container_id = c.container_id
)
WHERE c.container_id LIKE 'HTHU%'
  AND EXISTS (SELECT 1 FROM container_positions cp WHERE cp.container_id = c.container_id);

-- ─── 4. Recreate gate_in_receipt + yard_storage và set IN_YARD ─────────────

INSERT INTO gate_in_receipt (container_id, gate_in_time, note)
SELECT c.container_id, c.created_at, 'Tự động tái nhập kho - V47 layout - ' || c.container_id
FROM container c
WHERE c.container_id LIKE 'HTHU%'
  AND EXISTS (SELECT 1 FROM container_positions cp WHERE cp.container_id = c.container_id)
  AND NOT EXISTS (SELECT 1 FROM gate_in_receipt g WHERE g.container_id = c.container_id);

INSERT INTO yard_storage (container_id, yard_id, storage_start_date, note)
SELECT c.container_id,
       CASE ct.cargo_type_name
           WHEN 'Hàng Khô'   THEN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng khô')
           WHEN 'Hàng Lạnh'  THEN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng lạnh')
           WHEN 'Hàng Dễ Vỡ' THEN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng dễ vỡ')
           ELSE                   (SELECT yard_id FROM yards WHERE yard_name = 'Kho khác')
       END,
       c.created_at::DATE,
       'Tự động tái nhập kho - V47 layout - ' || c.container_id
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
