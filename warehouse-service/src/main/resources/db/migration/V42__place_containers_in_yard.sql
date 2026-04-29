-- =============================================================
-- V42 - Place 900 HTHU containers into yard positions
-- Changes status to IN_YARD, creates container_positions,
-- gate_in_receipt, and yard_storage records so they appear
-- in the 3D and 2D yard views.
--
-- Safely joins with yard_zones and yards to avoid orphaned blocks.
-- =============================================================
SET client_encoding = 'UTF8';

-- ─────────────────────────────────────────────────────────────
-- 1. Update status to IN_YARD for all HTHU containers
-- ─────────────────────────────────────────────────────────────
UPDATE container
SET status_id = (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD')
WHERE container_id LIKE 'HTHU%'
  AND status_id = (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE');

-- ─────────────────────────────────────────────────────────────
-- 2. Build a numbered list of all available (slot_id, tier)
--    positions ordered by yard type, then assign containers.
--    We use a CTE to match cargo types to correct yards.
-- ─────────────────────────────────────────────────────────────

-- Create gate_in_receipt for all HTHU containers
INSERT INTO gate_in_receipt (container_id, gate_in_time, note)
SELECT container_id,
       created_at,
       'Nhập kho tự động - ' || container_id
FROM container
WHERE container_id LIKE 'HTHU%'
ON CONFLICT DO NOTHING;

-- Create yard_storage for all HTHU containers (assign to correct yard)
INSERT INTO yard_storage (container_id, yard_id, storage_start_date, note)
SELECT
    c.container_id,
    CASE
        WHEN ct.cargo_type_name = 'Hàng Khô'   THEN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng khô')
        WHEN ct.cargo_type_name = 'Hàng Lạnh'   THEN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng lạnh')
        WHEN ct.cargo_type_name = 'Hàng Dễ Vỡ'  THEN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hàng dễ vỡ')
        ELSE                                          (SELECT yard_id FROM yards WHERE yard_name = 'Kho khác')
    END,
    c.created_at::DATE,
    'Lưu kho tự động - ' || c.container_id
FROM container c
JOIN cargo_types ct ON c.cargo_type_id = ct.cargo_type_id
WHERE c.container_id LIKE 'HTHU%'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. Assign container positions
--    Match each container to a slot in the correct yard/block
--    based on cargo type, filling slots row by row, bay by bay,
--    tier by tier.
-- ─────────────────────────────────────────────────────────────

-- DRY containers (HTHU0000001 - HTHU0000250) → Kho hàng khô
WITH dry_containers AS (
    SELECT container_id, ROW_NUMBER() OVER (ORDER BY container_id) - 1 AS idx
    FROM container
    WHERE container_id LIKE 'HTHU%'
      AND cargo_type_id = (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô')
),
dry_slots AS (
    SELECT s.slot_id, s.row_no, s.bay_no, s.max_tier,
           b.block_name,
           ROW_NUMBER() OVER (ORDER BY b.block_name, s.row_no, s.bay_no) - 1 AS slot_idx
    FROM slots s
    JOIN blocks b ON s.block_id = b.block_id
    JOIN yard_zones yz ON b.zone_id = yz.zone_id
    JOIN yards y ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng khô'
),
dry_assignments AS (
    SELECT
        dc.container_id,
        ds.slot_id,
        (dc.idx / (SELECT COUNT(*) FROM dry_slots)) + 1 AS tier
    FROM dry_containers dc
    JOIN dry_slots ds ON ds.slot_idx = dc.idx % (SELECT COUNT(*) FROM dry_slots)
)
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
SELECT container_id, slot_id, tier, NOW()
FROM dry_assignments
ON CONFLICT (container_id) DO NOTHING;

-- COLD containers (HTHU0000251 - HTHU0000500) → Kho hàng lạnh
WITH cold_containers AS (
    SELECT container_id, ROW_NUMBER() OVER (ORDER BY container_id) - 1 AS idx
    FROM container
    WHERE container_id LIKE 'HTHU%'
      AND cargo_type_id = (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh')
),
cold_slots AS (
    SELECT s.slot_id, s.row_no, s.bay_no, s.max_tier,
           b.block_name,
           ROW_NUMBER() OVER (ORDER BY b.block_name, s.row_no, s.bay_no) - 1 AS slot_idx
    FROM slots s
    JOIN blocks b ON s.block_id = b.block_id
    JOIN yard_zones yz ON b.zone_id = yz.zone_id
    JOIN yards y ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng lạnh'
),
cold_assignments AS (
    SELECT
        cc.container_id,
        cs.slot_id,
        (cc.idx / (SELECT COUNT(*) FROM cold_slots)) + 1 AS tier
    FROM cold_containers cc
    JOIN cold_slots cs ON cs.slot_idx = cc.idx % (SELECT COUNT(*) FROM cold_slots)
)
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
SELECT container_id, slot_id, tier, NOW()
FROM cold_assignments
ON CONFLICT (container_id) DO NOTHING;

-- FRAGILE containers (HTHU0000501 - HTHU0000750) → Kho hàng dễ vỡ
WITH fragile_containers AS (
    SELECT container_id, ROW_NUMBER() OVER (ORDER BY container_id) - 1 AS idx
    FROM container
    WHERE container_id LIKE 'HTHU%'
      AND cargo_type_id = (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Dễ Vỡ')
),
fragile_slots AS (
    SELECT s.slot_id, s.row_no, s.bay_no, s.max_tier,
           b.block_name,
           ROW_NUMBER() OVER (ORDER BY b.block_name, s.row_no, s.bay_no) - 1 AS slot_idx
    FROM slots s
    JOIN blocks b ON s.block_id = b.block_id
    JOIN yard_zones yz ON b.zone_id = yz.zone_id
    JOIN yards y ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho hàng dễ vỡ'
),
fragile_assignments AS (
    SELECT
        fc.container_id,
        fs.slot_id,
        (fc.idx / (SELECT COUNT(*) FROM fragile_slots)) + 1 AS tier
    FROM fragile_containers fc
    JOIN fragile_slots fs ON fs.slot_idx = fc.idx % (SELECT COUNT(*) FROM fragile_slots)
)
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
SELECT container_id, slot_id, tier, NOW()
FROM fragile_assignments
ON CONFLICT (container_id) DO NOTHING;

-- OTHER containers (HTHU0000751 - HTHU0000900) → Kho khác
WITH other_containers AS (
    SELECT container_id, ROW_NUMBER() OVER (ORDER BY container_id) - 1 AS idx
    FROM container
    WHERE container_id LIKE 'HTHU%'
      AND cargo_type_id = (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khác')
),
other_slots AS (
    SELECT s.slot_id, s.row_no, s.bay_no, s.max_tier,
           b.block_name,
           ROW_NUMBER() OVER (ORDER BY b.block_name, s.row_no, s.bay_no) - 1 AS slot_idx
    FROM slots s
    JOIN blocks b ON s.block_id = b.block_id
    JOIN yard_zones yz ON b.zone_id = yz.zone_id
    JOIN yards y ON yz.yard_id = y.yard_id
    WHERE y.yard_name = 'Kho khác'
),
other_assignments AS (
    SELECT
        oc.container_id,
        os.slot_id,
        (oc.idx / (SELECT COUNT(*) FROM other_slots)) + 1 AS tier
    FROM other_containers oc
    JOIN other_slots os ON os.slot_idx = oc.idx % (SELECT COUNT(*) FROM other_slots)
)
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
SELECT container_id, slot_id, tier, NOW()
FROM other_assignments
ON CONFLICT (container_id) DO NOTHING;
