-- =============================================================
-- V7 - Additional slots, IN_YARD containers, and positions
-- Purpose: populate 3D scene with real data across all 4 yard types
-- Adds slots to zones that had none (C2, D2), and new IN_YARD containers
-- =============================================================
SET client_encoding = 'UTF8';

-- ─────────────────────────────────────────────────────────────
-- 1. ADD MISSING SLOTS
--    C2-BLK1, D2-BLK1, B2-BLK1 had 0 or too few slots.
--    A2-BLK1, A3-BLK1 get an extra slot each.
-- ─────────────────────────────────────────────────────────────
INSERT INTO slots (block_id, row_no, bay_no, max_tier)
VALUES
    -- Cold zone B2 (already has bay=1, add bay=2)
    ((SELECT block_id FROM blocks WHERE block_name = 'B2-BLK1'), 1, 2, 4),

    -- Fragile zone C2 (had zero slots — add 2)
    ((SELECT block_id FROM blocks WHERE block_name = 'C2-BLK1'), 1, 1, 3),
    ((SELECT block_id FROM blocks WHERE block_name = 'C2-BLK1'), 1, 2, 3),

    -- Hazard zone D2 (had zero slots — add 2)
    ((SELECT block_id FROM blocks WHERE block_name = 'D2-BLK1'), 1, 1, 3),
    ((SELECT block_id FROM blocks WHERE block_name = 'D2-BLK1'), 1, 2, 3),

    -- Dry zone A3 (only had bay=1, add bay=2)
    ((SELECT block_id FROM blocks WHERE block_name = 'A3-BLK1'), 1, 2, 5);

-- ─────────────────────────────────────────────────────────────
-- 2. NEW IN_YARD CONTAINERS (CONT0011 – CONT0016)
--    One per zone to give the 3D scene meaningful data in every area
-- ─────────────────────────────────────────────────────────────
INSERT INTO container (container_id, manifest_id, container_type_id, status_id,
                       cargo_type_id, attribute_id, gross_weight, seal_number, note, created_at)
VALUES
    -- Cold / Lạnh — B2 zone
    ('CONT0011',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026006'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Cần làm lạnh'),
     17500.00, 'SL006001', 'Hàng lạnh khu B2 - nhiệt độ -20°C', '2026-02-11 08:00:00'),

    -- Cold / Lạnh — B1 zone (second slot, tier 2)
    ('CONT0012',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026006'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '40FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Cần làm lạnh'),
     23000.00, 'SL006002', 'Hàng lạnh khu B1 tầng 2', '2026-02-11 08:30:00'),

    -- Fragile / Dễ Vỡ — C2 zone
    ('CONT0013',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026007'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Dễ Vỡ'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Dễ vỡ'),
     14200.00, 'SL007001', 'Hàng dễ vỡ - khu C2', '2026-02-19 09:00:00'),

    -- Fragile / Dễ Vỡ — C1 zone tier 2
    ('CONT0014',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026007'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Dễ Vỡ'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Dễ vỡ'),
     11800.50, 'SL007002', 'Hàng dễ vỡ khu C1 tầng 2', '2026-02-19 09:30:00'),

    -- Hazard / Nguy Hiểm — D1 zone tier 2
    ('CONT0015',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026008'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Nguy Hiểm'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Nguy hiểm'),
     13500.00, 'SL008001', 'Hàng nguy hiểm khu D1 tầng 2', '2026-02-25 10:00:00'),

    -- Hazard / Nguy Hiểm — D2 zone
    ('CONT0016',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026008'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '40FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Nguy Hiểm'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Nguy hiểm'),
     19800.00, 'SL008002', 'Hàng nguy hiểm khu D2', '2026-02-25 10:30:00');

-- ─────────────────────────────────────────────────────────────
-- 3. GATE IN RECEIPTS for new containers
-- ─────────────────────────────────────────────────────────────
INSERT INTO gate_in_receipt (container_id, voyage_id, gate_in_time, note)
VALUES
    ('CONT0011', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026006'), '2026-02-11 08:00:00', 'Hàng lạnh B2 - kiểm tra reefer OK'),
    ('CONT0012', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026006'), '2026-02-11 08:30:00', 'Hàng lạnh B1 tầng 2'),
    ('CONT0013', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026007'), '2026-02-19 09:00:00', 'Hàng dễ vỡ C2 - xe nâng chuyên dụng'),
    ('CONT0014', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026007'), '2026-02-19 09:30:00', 'Hàng dễ vỡ C1 tầng 2'),
    ('CONT0015', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026008'), '2026-02-25 10:00:00', 'Hàng nguy hiểm D1 - kiểm tra chứng từ'),
    ('CONT0016', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026008'), '2026-02-25 10:30:00', 'Hàng nguy hiểm D2');

-- ─────────────────────────────────────────────────────────────
-- 4. YARD STORAGE for new containers
-- ─────────────────────────────────────────────────────────────
INSERT INTO yard_storage (container_id, yard_id, storage_start_date, storage_end_date, note)
VALUES
    ('CONT0011', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Lạnh B'),      '2026-02-11', NULL, 'Hàng lạnh khu B2'),
    ('CONT0012', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Lạnh B'),      '2026-02-11', NULL, 'Hàng lạnh khu B1 tầng 2'),
    ('CONT0013', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Đặc Biệt C'), '2026-02-19', NULL, 'Hàng dễ vỡ khu C2'),
    ('CONT0014', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Đặc Biệt C'), '2026-02-19', NULL, 'Hàng dễ vỡ khu C1 tầng 2'),
    ('CONT0015', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Nguy Hiểm D'), '2026-02-25', NULL, 'Hàng nguy hiểm khu D1 tầng 2'),
    ('CONT0016', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Nguy Hiểm D'), '2026-02-25', NULL, 'Hàng nguy hiểm khu D2');

-- ─────────────────────────────────────────────────────────────
-- 5. CONTAINER POSITIONS for new containers
-- ─────────────────────────────────────────────────────────────
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
VALUES
    -- CONT0011 → B2-BLK1, row=1, bay=1, tier=1
    ('CONT0011',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'B2-BLK1' AND s.row_no = 1 AND s.bay_no = 1),
     1, '2026-02-11 09:00:00'),

    -- CONT0012 → B1-BLK1, row=1, bay=2, tier=2  (stacked above CONT0002)
    ('CONT0012',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'B1-BLK1' AND s.row_no = 1 AND s.bay_no = 2),
     2, '2026-02-11 09:30:00'),

    -- CONT0013 → C2-BLK1, row=1, bay=1, tier=1
    ('CONT0013',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'C2-BLK1' AND s.row_no = 1 AND s.bay_no = 1),
     1, '2026-02-19 10:00:00'),

    -- CONT0014 → C1-BLK1, row=1, bay=1, tier=2  (stacked above CONT0007)
    ('CONT0014',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'C1-BLK1' AND s.row_no = 1 AND s.bay_no = 1),
     2, '2026-02-19 10:30:00'),

    -- CONT0015 → D1-BLK1, row=1, bay=1, tier=2  (stacked above CONT0004 OVERDUE)
    ('CONT0015',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'D1-BLK1' AND s.row_no = 1 AND s.bay_no = 1),
     2, '2026-02-25 11:00:00'),

    -- CONT0016 → D2-BLK1, row=1, bay=1, tier=1
    ('CONT0016',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'D2-BLK1' AND s.row_no = 1 AND s.bay_no = 1),
     1, '2026-02-25 11:30:00');
