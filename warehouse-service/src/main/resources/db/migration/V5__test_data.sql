-- =============================================================
-- V5 - Test Data
-- HT Port Logistics — Warehouse Management System
-- Safe: does NOT modify users / roles / auth tables
-- Inserts ~10 records per business table in FK-safe order
-- =============================================================
SET client_encoding = 'UTF8';

-- ─────────────────────────────────────────────────────────────
-- 1. VESSELS
-- ─────────────────────────────────────────────────────────────
INSERT INTO vessels (vessel_name, shipping_line) VALUES
    ('MAERSK EINDHOVEN',    'Maersk Line'),
    ('CMA CGM MARCO POLO',  'CMA CGM'),
    ('EVER GOLDEN',         'Evergreen Marine'),
    ('COSCO ARIES',         'COSCO Shipping'),
    ('MSC ISABELLA',        'MSC'),
    ('OOCL HONG KONG',      'OOCL'),
    ('HAPAG BANGALORE',     'Hapag-Lloyd'),
    ('ONE INFINITY',        'Ocean Network Express'),
    ('YM TROPHY',           'Yang Ming'),
    ('PIL JAKARTA',         'Pacific International Lines');

-- ─────────────────────────────────────────────────────────────
-- 2. VOYAGES  (1 per vessel)
-- ─────────────────────────────────────────────────────────────
INSERT INTO voyages (vessel_id, voyage_no, port_of_loading, port_of_discharge,
                     estimated_time_arrival, actual_time_arrival, created_at)
VALUES
    ((SELECT vessel_id FROM vessels WHERE vessel_name = 'MAERSK EINDHOVEN'),
     'VOY2026001', 'Busan',      'Cát Lái',
     '2026-01-10 06:00:00', '2026-01-11 08:00:00', '2025-12-20 10:00:00'),

    ((SELECT vessel_id FROM vessels WHERE vessel_name = 'CMA CGM MARCO POLO'),
     'VOY2026002', 'Shanghai',   'Cái Mép',
     '2026-01-15 14:00:00', '2026-01-16 09:00:00', '2026-01-01 08:00:00'),

    ((SELECT vessel_id FROM vessels WHERE vessel_name = 'EVER GOLDEN'),
     'VOY2026003', 'Singapore',  'Cát Lái',
     '2026-01-20 06:00:00', '2026-01-20 10:30:00', '2026-01-05 09:00:00'),

    ((SELECT vessel_id FROM vessels WHERE vessel_name = 'COSCO ARIES'),
     'VOY2026004', 'Hong Kong',  'Cái Mép',
     '2026-01-28 08:00:00', '2026-01-29 07:00:00', '2026-01-12 10:00:00'),

    ((SELECT vessel_id FROM vessels WHERE vessel_name = 'MSC ISABELLA'),
     'VOY2026005', 'Kaohsiung',  'Cát Lái',
     '2026-02-05 12:00:00', '2026-02-05 14:30:00', '2026-01-18 11:00:00'),

    ((SELECT vessel_id FROM vessels WHERE vessel_name = 'OOCL HONG KONG'),
     'VOY2026006', 'Incheon',    'Cái Mép',
     '2026-02-10 08:00:00', '2026-02-11 06:00:00', '2026-01-22 09:00:00'),

    ((SELECT vessel_id FROM vessels WHERE vessel_name = 'HAPAG BANGALORE'),
     'VOY2026007', 'Tokyo',      'Cát Lái',
     '2026-02-18 10:00:00', '2026-02-19 09:00:00', '2026-01-28 08:00:00'),

    ((SELECT vessel_id FROM vessels WHERE vessel_name = 'ONE INFINITY'),
     'VOY2026008', 'Kobe',       'Cái Mép',
     '2026-02-25 14:00:00', NULL, '2026-02-01 10:00:00'),

    ((SELECT vessel_id FROM vessels WHERE vessel_name = 'YM TROPHY'),
     'VOY2026009', 'Osaka',      'Cát Lái',
     '2026-03-05 06:00:00', NULL, '2026-02-10 09:00:00'),

    ((SELECT vessel_id FROM vessels WHERE vessel_name = 'PIL JAKARTA'),
     'VOY2026010', 'Port Klang', 'Cái Mép',
     '2026-03-15 08:00:00', NULL, '2026-02-20 10:00:00');

-- ─────────────────────────────────────────────────────────────
-- 3. MANIFEST  (1 per voyage)
-- ─────────────────────────────────────────────────────────────
INSERT INTO manifest (voyage_id, created_date, note)
VALUES
    ((SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026001'), '2026-01-10', 'Lô hàng T1/2026 - Busan'),
    ((SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026002'), '2026-01-15', 'Lô hàng T1/2026 - Shanghai'),
    ((SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026003'), '2026-01-20', 'Lô hàng T1/2026 - Singapore'),
    ((SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026004'), '2026-01-28', 'Lô hàng T1/2026 - Hong Kong'),
    ((SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026005'), '2026-02-05', 'Lô hàng T2/2026 - Kaohsiung'),
    ((SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026006'), '2026-02-10', 'Lô hàng T2/2026 - Incheon'),
    ((SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026007'), '2026-02-18', 'Lô hàng T2/2026 - Tokyo'),
    ((SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026008'), '2026-02-25', 'Lô hàng T2/2026 - Kobe'),
    ((SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026009'), '2026-03-05', 'Lô hàng T3/2026 - Osaka'),
    ((SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026010'), '2026-03-15', 'Lô hàng T3/2026 - Port Klang');

-- ─────────────────────────────────────────────────────────────
-- 4. YARDS  (one per yard_type)
-- ─────────────────────────────────────────────────────────────
INSERT INTO yards (yard_type_id, yard_name, address)
VALUES
    ((SELECT yard_type_id FROM yard_types WHERE yard_type_name = 'dry'),
     'Bãi Khô A', 'Khu A, Cảng Cát Lái, TP.HCM'),
    ((SELECT yard_type_id FROM yard_types WHERE yard_type_name = 'cold'),
     'Bãi Lạnh B', 'Khu B, Cảng Cát Lái, TP.HCM'),
    ((SELECT yard_type_id FROM yard_types WHERE yard_type_name = 'fragile'),
     'Bãi Đặc Biệt C', 'Khu C, Cảng Cát Lái, TP.HCM'),
    ((SELECT yard_type_id FROM yard_types WHERE yard_type_name = 'hazard'),
     'Bãi Nguy Hiểm D', 'Khu D, Cảng Cát Lái, TP.HCM');

-- ─────────────────────────────────────────────────────────────
-- 5. YARD ZONES  (10 across 4 yards)
-- ─────────────────────────────────────────────────────────────
INSERT INTO yard_zones (yard_id, zone_name, capacity_slots)
VALUES
    ((SELECT yard_id FROM yards WHERE yard_name = 'Bãi Khô A'),       'A1', 50),
    ((SELECT yard_id FROM yards WHERE yard_name = 'Bãi Khô A'),       'A2', 50),
    ((SELECT yard_id FROM yards WHERE yard_name = 'Bãi Khô A'),       'A3', 40),
    ((SELECT yard_id FROM yards WHERE yard_name = 'Bãi Lạnh B'),      'B1', 30),
    ((SELECT yard_id FROM yards WHERE yard_name = 'Bãi Lạnh B'),      'B2', 25),
    ((SELECT yard_id FROM yards WHERE yard_name = 'Bãi Đặc Biệt C'), 'C1', 20),
    ((SELECT yard_id FROM yards WHERE yard_name = 'Bãi Đặc Biệt C'), 'C2', 20),
    ((SELECT yard_id FROM yards WHERE yard_name = 'Bãi Nguy Hiểm D'), 'D1', 15),
    ((SELECT yard_id FROM yards WHERE yard_name = 'Bãi Nguy Hiểm D'), 'D2', 15),
    ((SELECT yard_id FROM yards WHERE yard_name = 'Bãi Khô A'),       'A4', 35);

-- ─────────────────────────────────────────────────────────────
-- 6. BLOCKS  (1 per zone)
-- ─────────────────────────────────────────────────────────────
INSERT INTO blocks (zone_id, block_type_id, block_name)
VALUES
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'A1'),
     (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'), 'A1-BLK1'),
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'A2'),
     (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'), 'A2-BLK1'),
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'A3'),
     (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'), 'A3-BLK1'),
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'A4'),
     (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'), 'A4-BLK1'),
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'B1'),
     (SELECT block_type_id FROM block_types WHERE block_type_name = 'REEFER'),   'B1-BLK1'),
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'B2'),
     (SELECT block_type_id FROM block_types WHERE block_type_name = 'REEFER'),   'B2-BLK1'),
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'C1'),
     (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'), 'C1-BLK1'),
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'C2'),
     (SELECT block_type_id FROM block_types WHERE block_type_name = 'STANDARD'), 'C2-BLK1'),
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'D1'),
     (SELECT block_type_id FROM block_types WHERE block_type_name = 'HAZMAT'),   'D1-BLK1'),
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'D2'),
     (SELECT block_type_id FROM block_types WHERE block_type_name = 'HAZMAT'),   'D2-BLK1');

-- ─────────────────────────────────────────────────────────────
-- 7. SLOTS  (10 records across several blocks)
-- ─────────────────────────────────────────────────────────────
INSERT INTO slots (block_id, row_no, bay_no, max_tier)
VALUES
    ((SELECT block_id FROM blocks WHERE block_name = 'A1-BLK1'), 1, 1, 5),
    ((SELECT block_id FROM blocks WHERE block_name = 'A1-BLK1'), 1, 2, 5),
    ((SELECT block_id FROM blocks WHERE block_name = 'A2-BLK1'), 1, 1, 5),
    ((SELECT block_id FROM blocks WHERE block_name = 'A2-BLK1'), 1, 2, 5),
    ((SELECT block_id FROM blocks WHERE block_name = 'A3-BLK1'), 1, 1, 5),
    ((SELECT block_id FROM blocks WHERE block_name = 'B1-BLK1'), 1, 1, 4),
    ((SELECT block_id FROM blocks WHERE block_name = 'B1-BLK1'), 1, 2, 4),
    ((SELECT block_id FROM blocks WHERE block_name = 'B2-BLK1'), 1, 1, 4),
    ((SELECT block_id FROM blocks WHERE block_name = 'C1-BLK1'), 1, 1, 3),
    ((SELECT block_id FROM blocks WHERE block_name = 'D1-BLK1'), 1, 1, 3);

-- ─────────────────────────────────────────────────────────────
-- 8. CONTAINERS  (10 records, realistic mix of statuses)
--
--   Statuses (from V2 seed order):
--     AVAILABLE=1  GATE_IN=2  IN_YARD=3  GATE_OUT=4
--     EXPORTED=5   DAMAGED=6  OVERDUE=7  CANCELLED=8
--   Container types:  20FT=1  40FT=2
--   Cargo types:      Hàng Khô=1  Hàng Lạnh=2
--                     Hàng Dễ Vỡ=3  Hàng Nguy Hiểm=4
--   Attributes:       Tiêu chuẩn=1  Cần làm lạnh=2
--                     Dễ vỡ=3  Nguy hiểm=4  Quá khổ=5
-- ─────────────────────────────────────────────────────────────
INSERT INTO container (container_id, manifest_id, container_type_id, status_id,
                       cargo_type_id, attribute_id, gross_weight, seal_number, note, created_at)
VALUES
    -- IN_YARD containers (CONT0001, CONT0002, CONT0007, CONT0008)
    ('CONT0001',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026001'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Tiêu chuẩn'),
     18500.00, 'SL001001', 'Hàng khô tiêu chuẩn - khu A1', '2026-01-11 09:00:00'),

    ('CONT0002',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026001'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '40FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Cần làm lạnh'),
     22000.50, 'SL001002', 'Hàng lạnh cần duy trì nhiệt độ -18°C', '2026-01-11 09:30:00'),

    -- OVERDUE containers (CONT0003, CONT0004)
    ('CONT0003',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026002'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'OVERDUE'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Tiêu chuẩn'),
     15200.00, 'SL002001', 'Quá hạn lưu kho - chủ hàng chưa liên hệ', '2026-01-16 10:00:00'),

    ('CONT0004',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026002'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '40FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'OVERDUE'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Nguy Hiểm'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Nguy hiểm'),
     12800.75, 'SL002002', 'Hàng nguy hiểm - quá hạn 15 ngày', '2026-01-16 10:30:00'),

    -- GATE_OUT containers (CONT0005, CONT0006) — already departed
    ('CONT0005',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026003'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'GATE_OUT'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Tiêu chuẩn'),
     19500.00, 'SL003001', 'Đã gate out ngày 15/02/2026', '2026-01-21 08:00:00'),

    ('CONT0006',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026003'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '40FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'GATE_OUT'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Cần làm lạnh'),
     24000.00, 'SL003002', 'Hàng lạnh đã gate out ngày 20/02/2026', '2026-01-21 08:30:00'),

    -- More IN_YARD containers
    ('CONT0007',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026004'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Dễ Vỡ'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Dễ vỡ'),
     16500.25, 'SL004001', 'Hàng dễ vỡ - thao tác nhẹ nhàng', '2026-01-29 09:00:00'),

    ('CONT0008',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026004'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '40FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'IN_YARD'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Tiêu chuẩn'),
     21000.00, 'SL004002', 'Hàng khô tiêu chuẩn khu A2', '2026-01-29 09:30:00'),

    -- GATE_IN container (just arrived, being processed)
    ('CONT0009',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026005'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'GATE_IN'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Cần làm lạnh'),
     8900.00,  'SL005001', 'Hàng lạnh mới gate in - chờ phân vị trí', '2026-02-06 07:00:00'),

    -- AVAILABLE container (registered, not yet arrived)
    ('CONT0010',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026005'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '40FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Quá khổ'),
     14500.00, 'SL005002', 'Container quá khổ - chờ xác nhận', '2026-02-06 07:30:00');

-- ─────────────────────────────────────────────────────────────
-- 9. GATE IN RECEIPTS  (for all containers that have arrived)
-- ─────────────────────────────────────────────────────────────
INSERT INTO gate_in_receipt (container_id, voyage_id, gate_in_time, note)
VALUES
    ('CONT0001', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026001'), '2026-01-11 09:00:00', 'Gate in bình thường'),
    ('CONT0002', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026001'), '2026-01-11 09:30:00', 'Hàng lạnh - kiểm tra nhiệt độ OK'),
    ('CONT0003', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026002'), '2026-01-16 10:00:00', 'Gate in tháng 1 - hàng khô'),
    ('CONT0004', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026002'), '2026-01-16 10:30:00', 'Hàng nguy hiểm - kiểm tra chứng từ đặc biệt'),
    ('CONT0005', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026003'), '2026-01-21 08:00:00', 'Gate in tháng 1'),
    ('CONT0006', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026003'), '2026-01-21 08:30:00', 'Hàng lạnh - xác nhận thiết bị reefer OK'),
    ('CONT0007', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026004'), '2026-01-29 09:00:00', 'Hàng dễ vỡ - sử dụng xe nâng chuyên dụng'),
    ('CONT0008', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026004'), '2026-01-29 09:30:00', 'Gate in bình thường'),
    ('CONT0009', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026005'), '2026-02-06 07:00:00', 'Hàng lạnh mới vào - chờ phân vị trí'),
    ('CONT0010', (SELECT voyage_id FROM voyages WHERE voyage_no = 'VOY2026005'), '2026-02-06 08:00:00', 'Container quá khổ - kiểm tra kích thước');

-- ─────────────────────────────────────────────────────────────
-- 10. CONTAINER POSITIONS
--     Only for IN_YARD (CONT0001, CONT0002, CONT0007, CONT0008)
--     and OVERDUE (CONT0003, CONT0004) — they are physically present
-- ─────────────────────────────────────────────────────────────
INSERT INTO container_positions (container_id, slot_id, tier, updated_at)
VALUES
    ('CONT0001',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'A1-BLK1' AND s.row_no = 1 AND s.bay_no = 1),
     1, '2026-01-11 12:00:00'),
    ('CONT0002',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'B1-BLK1' AND s.row_no = 1 AND s.bay_no = 1),
     1, '2026-01-11 12:30:00'),
    ('CONT0003',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'A1-BLK1' AND s.row_no = 1 AND s.bay_no = 2),
     2, '2026-01-16 13:00:00'),
    ('CONT0004',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'D1-BLK1' AND s.row_no = 1 AND s.bay_no = 1),
     1, '2026-01-16 13:30:00'),
    ('CONT0007',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'C1-BLK1' AND s.row_no = 1 AND s.bay_no = 1),
     1, '2026-01-29 11:00:00'),
    ('CONT0008',
     (SELECT s.slot_id FROM slots s JOIN blocks b ON s.block_id = b.block_id WHERE b.block_name = 'A2-BLK1' AND s.row_no = 1 AND s.bay_no = 1),
     1, '2026-01-29 11:30:00');

-- ─────────────────────────────────────────────────────────────
-- 11. YARD STORAGE
-- ─────────────────────────────────────────────────────────────
INSERT INTO yard_storage (container_id, yard_id, storage_start_date, storage_end_date, note)
VALUES
    ('CONT0001', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Khô A'),       '2026-01-11', NULL,         'Đang lưu kho - bãi khô A1'),
    ('CONT0002', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Lạnh B'),      '2026-01-11', NULL,         'Hàng lạnh đang lưu kho'),
    ('CONT0003', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Khô A'),       '2026-01-16', NULL,         'Quá hạn lưu kho - cần xử lý'),
    ('CONT0004', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Nguy Hiểm D'), '2026-01-16', NULL,         'Hàng nguy hiểm quá hạn'),
    ('CONT0005', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Khô A'),       '2026-01-21', '2026-02-15', 'Đã xuất - hết lưu kho'),
    ('CONT0006', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Lạnh B'),      '2026-01-21', '2026-02-20', 'Hàng lạnh đã xuất kho'),
    ('CONT0007', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Đặc Biệt C'), '2026-01-29', NULL,         'Hàng dễ vỡ đang lưu kho'),
    ('CONT0008', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Khô A'),       '2026-01-29', NULL,         'Đang lưu kho - bãi khô A2'),
    ('CONT0009', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Lạnh B'),      '2026-02-06', NULL,         'Hàng lạnh mới gate in'),
    ('CONT0010', (SELECT yard_id FROM yards WHERE yard_name = 'Bãi Khô A'),       '2026-02-06', NULL,         'Hàng quá khổ mới gate in');

-- ─────────────────────────────────────────────────────────────
-- 12. GATE OUT RECEIPTS  (for GATE_OUT containers)
-- ─────────────────────────────────────────────────────────────
INSERT INTO gate_out_receipt (container_id, gate_out_time, note)
VALUES
    ('CONT0005', '2026-02-15 14:00:00', 'Gate out bình thường - đầy đủ thủ tục'),
    ('CONT0006', '2026-02-20 10:00:00', 'Gate out hàng lạnh - đã kiểm tra nhiệt độ trước khi xuất');

-- ─────────────────────────────────────────────────────────────
-- 13. STORAGE INVOICES  (generated at gate-out time)
-- ─────────────────────────────────────────────────────────────
-- CONT0005: gate in 2026-01-21, gate out 2026-02-15 → 25 days storage
-- CONT0006: gate in 2026-01-21, gate out 2026-02-20 → 30 days storage (reefer surcharge)
INSERT INTO storage_invoice (container_id, gate_out_id, storage_days,
                              daily_rate, base_fee, overdue_penalty,
                              total_fee, is_overdue, overdue_days, created_at)
VALUES
    ('CONT0005',
     (SELECT gate_out_id FROM gate_out_receipt WHERE container_id = 'CONT0005'),
     25, 50.00, 1250.00, 0.00, 1250.00, FALSE, 0, '2026-02-15 14:05:00'),

    ('CONT0006',
     (SELECT gate_out_id FROM gate_out_receipt WHERE container_id = 'CONT0006'),
     30, 65.00, 1950.00, 0.00, 1950.00, FALSE, 0, '2026-02-20 10:05:00');

-- ─────────────────────────────────────────────────────────────
-- 14. ORDERS  (10 records, various statuses)
-- ─────────────────────────────────────────────────────────────
INSERT INTO orders (customer_id, customer_name, phone, email, address, status_id, note, created_at)
VALUES
    (NULL, 'Công ty TNHH Thương Mại Phú Quý',   '0901234567', 'phuquy@example.com',
     '45 Nguyễn Huệ, Q.1, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'APPROVED'),
     'Đặt lấy 2 container hàng khô', '2026-01-25 08:00:00'),

    (NULL, 'Công ty CP Logistics Việt Nam',       '0912345678', 'logistics.vn@example.com',
     '120 Lê Lợi, Q.1, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'APPROVED'),
     'Hàng lạnh cần xe reefer đón', '2026-01-26 09:00:00'),

    (NULL, 'Công ty TNHH Xuất Nhập Khẩu Hải Nam', '0923456789', 'hainam.xnk@example.com',
     '88 Trần Hưng Đạo, Q.5, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'PENDING'),
     'Chờ xác nhận chứng từ hải quan', '2026-02-01 10:00:00'),

    (NULL, 'Tập đoàn Đại Dương Xanh',             '0934567890', 'daiduong.xanh@example.com',
     '22 Võ Thị Sáu, Q.3, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'PENDING'),
     'Container quá khổ - cần xe đặc biệt', '2026-02-03 11:00:00'),

    (NULL, 'Công ty TNHH Vận Tải Mê Kông',       '0945678901', 'mekong.transport@example.com',
     '5 Phạm Văn Đồng, Bình Thạnh, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'APPROVED'),
     'Lấy container hàng nguy hiểm - có giấy phép', '2026-01-30 08:30:00'),

    (NULL, 'Công ty Cổ Phần Thương Mại Sài Gòn', '0956789012', 'saigon.trade@example.com',
     '99 Cộng Hòa, Tân Bình, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'REJECTED'),
     'Từ chối - chứng từ không hợp lệ', '2026-01-18 14:00:00'),

    (NULL, 'Công ty TNHH Minh Phát',              '0967890123', 'minhphat@example.com',
     '33 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'CANCELLED'),
     'Hủy theo yêu cầu khách hàng', '2026-01-12 09:00:00'),

    (NULL, 'Công ty TNHH Thái Bình Dương',        '0978901234', 'thaibinhduong@example.com',
     '77 Hai Bà Trưng, Q.3, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'PENDING'),
     'Đặt hàng mới tháng 2', '2026-02-08 10:00:00'),

    (NULL, 'Tổng Công ty Cảng Sài Gòn',           '0989012345', 'cangsg@example.com',
     '1 Vĩnh Khánh, Q.4, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'APPROVED'),
     'Đơn định kỳ tháng 2', '2026-02-10 08:00:00'),

    (NULL, 'Công ty TNHH Hàng Hải Bình Minh',    '0990123456', 'binhminh.maritime@example.com',
     '15 Nguyễn Đình Chiểu, Q.3, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'PENDING'),
     'Đang chờ xét duyệt', '2026-02-15 09:00:00');

-- ─────────────────────────────────────────────────────────────
-- 15. ORDER CONTAINER  (link approved orders to containers)
-- ─────────────────────────────────────────────────────────────
-- Order 1 (Approved - Phú Quý) → CONT0005 (already GATE_OUT, completed)
-- Order 2 (Approved - Logistics VN) → CONT0006 (already GATE_OUT, completed)
-- Order 5 (Approved - Mê Kông) → CONT0004 (OVERDUE)
-- Order 9 (Approved - Cảng Sài Gòn) → CONT0007
-- Add a few more to PENDING orders as well
INSERT INTO order_container (order_id, container_id)
VALUES
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty TNHH Thương Mại Phú Quý'),   'CONT0005'),
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty CP Logistics Việt Nam'),      'CONT0006'),
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty TNHH Vận Tải Mê Kông'),      'CONT0004'),
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Tổng Công ty Cảng Sài Gòn'),         'CONT0007'),
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty TNHH Xuất Nhập Khẩu Hải Nam'), 'CONT0008'),
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Tập đoàn Đại Dương Xanh'),           'CONT0010');

-- ─────────────────────────────────────────────────────────────
-- 16. BILL OF LADING  (for approved orders)
-- ─────────────────────────────────────────────────────────────
INSERT INTO bill_of_lading (order_id, bill_number, created_date, status_id, note)
VALUES
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty TNHH Thương Mại Phú Quý'),
     'BL2026001', '2026-01-26',
     (SELECT status_id FROM bill_of_lading_status WHERE status_name = 'ISSUED'),
     'Vận đơn đã phát hành - hàng đã xuất'),

    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty CP Logistics Việt Nam'),
     'BL2026002', '2026-01-27',
     (SELECT status_id FROM bill_of_lading_status WHERE status_name = 'ISSUED'),
     'Vận đơn hàng lạnh đã phát hành'),

    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty TNHH Vận Tải Mê Kông'),
     'BL2026003', '2026-01-31',
     (SELECT status_id FROM bill_of_lading_status WHERE status_name = 'DRAFT'),
     'Bản nháp - chờ ký xác nhận'),

    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Tổng Công ty Cảng Sài Gòn'),
     'BL2026004', '2026-02-11',
     (SELECT status_id FROM bill_of_lading_status WHERE status_name = 'DRAFT'),
     'Bản nháp đơn tháng 2'),

    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty TNHH Thái Bình Dương'),
     'BL2026005', '2026-02-09',
     (SELECT status_id FROM bill_of_lading_status WHERE status_name = 'DRAFT'),
     'Đơn mới tháng 2 - chờ xác nhận');

-- ─────────────────────────────────────────────────────────────
-- 17. ALERTS  (for yard zones with issues)
-- ─────────────────────────────────────────────────────────────
INSERT INTO alert (zone_id, level_id, description, created_at, status)
VALUES
    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'A1'),
     (SELECT level_id FROM alert_level WHERE level_name = 'WARNING'),
     'Khu A1 đạt 80% sức chứa - cần phân bổ lại container', '2026-02-10 08:00:00', 0),

    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'B1'),
     (SELECT level_id FROM alert_level WHERE level_name = 'CRITICAL'),
     'Hệ thống reefer B1 báo lỗi nhiệt độ - kiểm tra ngay', '2026-02-12 14:00:00', 0),

    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'D1'),
     (SELECT level_id FROM alert_level WHERE level_name = 'CRITICAL'),
     'Container hàng nguy hiểm D1 quá hạn lưu kho - cảnh báo khẩn', '2026-02-01 09:00:00', 1),

    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'A1'),
     (SELECT level_id FROM alert_level WHERE level_name = 'INFO'),
     'CONT0003 quá hạn 15 ngày - phí lưu kho đang tích lũy', '2026-01-31 07:00:00', 1),

    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'C1'),
     (SELECT level_id FROM alert_level WHERE level_name = 'WARNING'),
     'Khu hàng dễ vỡ C1 cần kiểm tra chèn lót container', '2026-02-05 10:00:00', 0),

    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'B2'),
     (SELECT level_id FROM alert_level WHERE level_name = 'INFO'),
     'Dự báo lấp đầy khu lạnh B2 vào cuối tháng 2', '2026-02-15 11:00:00', 0),

    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'D2'),
     (SELECT level_id FROM alert_level WHERE level_name = 'WARNING'),
     'Khu D2 - hết dung lượng hàng nguy hiểm', '2026-02-20 08:00:00', 0),

    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'A2'),
     (SELECT level_id FROM alert_level WHERE level_name = 'INFO'),
     'Nhận thêm 3 container từ VOY2026004 vào khu A2', '2026-01-29 10:00:00', 1),

    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'A3'),
     (SELECT level_id FROM alert_level WHERE level_name = 'INFO'),
     'Khu A3 còn 30% sức chứa - sẵn sàng tiếp nhận', '2026-02-18 09:00:00', 0),

    ((SELECT zone_id FROM yard_zones WHERE zone_name = 'B1'),
     (SELECT level_id FROM alert_level WHERE level_name = 'WARNING'),
     'Kiểm tra định kỳ hệ thống làm lạnh khu B1', '2026-03-01 08:00:00', 0);
