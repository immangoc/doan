-- =============================================================
-- V9 - Fix test data: add AVAILABLE containers with APPROVED orders
--      so the "waiting list" (Danh sách chờ nhập kho) panel has data.
--
-- Rule: waiting list shows containers that:
--   1. status = AVAILABLE
--   2. have an APPROVED order linked via order_container
--   3. have NO row in container_positions (not yet gate-in'd to a slot)
--
-- CONT0010 already exists but its order is PENDING.
-- This migration adds CONT0017–CONT0020 from upcoming voyages
-- (VOY2026009 / VOY2026010 — not yet arrived), all status AVAILABLE,
-- each linked to a fresh APPROVED order.
-- No gate_in_receipt and no container_positions are inserted for these
-- containers so they stay in the waiting list.
-- =============================================================
SET client_encoding = 'UTF8';

-- ─────────────────────────────────────────────────────────────
-- 1. NEW AVAILABLE CONTAINERS  (CONT0017 – CONT0020)
--    Use manifests from voyages that have not yet arrived.
-- ─────────────────────────────────────────────────────────────
INSERT INTO container (container_id, manifest_id, container_type_id, status_id,
                       cargo_type_id, attribute_id, gross_weight, seal_number, note, created_at)
VALUES
    -- Dry / Khô — from VOY2026009 (Osaka, ETA 2026-03-05)
    ('CONT0017',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026009'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Tiêu chuẩn'),
     16800.00, 'SL009001', 'Hàng khô chờ nhập kho - tàu VOY2026009', '2026-02-20 08:00:00'),

    -- Cold / Lạnh — from VOY2026009 (Osaka, ETA 2026-03-05)
    ('CONT0018',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026009'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '40FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Cần làm lạnh'),
     21500.00, 'SL009002', 'Hàng lạnh chờ nhập kho - cần khu B', '2026-02-20 08:30:00'),

    -- Fragile / Dễ Vỡ — from VOY2026010 (Port Klang, ETA 2026-03-15)
    ('CONT0019',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026010'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Dễ Vỡ'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Dễ vỡ'),
     12300.00, 'SL010001', 'Hàng dễ vỡ chờ nhập kho - khu C', '2026-02-28 09:00:00'),

    -- Dry / Khô (oversized) — from VOY2026010 (Port Klang, ETA 2026-03-15)
    ('CONT0020',
     (SELECT m.manifest_id FROM manifest m JOIN voyages v ON m.voyage_id = v.voyage_id WHERE v.voyage_no = 'VOY2026010'),
     (SELECT container_type_id FROM container_types WHERE container_type_name = '40FT'),
     (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE'),
     (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô'),
     (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Quá khổ'),
     24500.00, 'SL010002', 'Hàng khô quá khổ chờ nhập kho', '2026-02-28 09:30:00');

-- ─────────────────────────────────────────────────────────────
-- 2. NEW APPROVED ORDERS  (one per waiting container)
-- ─────────────────────────────────────────────────────────────
INSERT INTO orders (customer_id, customer_name, phone, email, address, status_id, note, created_at)
VALUES
    (NULL, 'Công ty TNHH Xuất Nhập Khẩu Đông Nam Á', '0901111222', 'dnasia@example.com',
     '12 Bến Vân Đồn, Q.4, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'APPROVED'),
     'Nhận hàng khô từ tàu VOY2026009', '2026-02-22 08:00:00'),

    (NULL, 'Tập Đoàn Thực Phẩm Á Châu',              '0912222333', 'achau.food@example.com',
     '56 Đinh Bộ Lĩnh, Bình Thạnh, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'APPROVED'),
     'Hàng lạnh cần xe reefer - khu B', '2026-02-23 09:00:00'),

    (NULL, 'Công ty TNHH Thủy Tinh Sài Gòn',         '0923333444', 'saigon.glass@example.com',
     '78 Trường Sa, Q.Phú Nhuận, TP.HCM',
     (SELECT status_id FROM order_status WHERE status_name = 'APPROVED'),
     'Hàng dễ vỡ - thao tác đặc biệt', '2026-03-01 10:00:00'),

    (NULL, 'Công ty Cổ Phần Cơ Khí Nặng Phía Nam',   '0934444555', 'heavy.mech@example.com',
     '200 Quốc Lộ 13, Bình Dương',
     (SELECT status_id FROM order_status WHERE status_name = 'APPROVED'),
     'Hàng khô quá khổ - cần xe đặc chủng', '2026-03-03 08:00:00');

-- ─────────────────────────────────────────────────────────────
-- 3. LINK containers to orders via order_container
-- ─────────────────────────────────────────────────────────────
INSERT INTO order_container (order_id, container_id)
VALUES
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty TNHH Xuất Nhập Khẩu Đông Nam Á'), 'CONT0017'),
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Tập Đoàn Thực Phẩm Á Châu'),              'CONT0018'),
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty TNHH Thủy Tinh Sài Gòn'),         'CONT0019'),
    ((SELECT o.order_id FROM orders o WHERE o.customer_name = 'Công ty Cổ Phần Cơ Khí Nặng Phía Nam'),   'CONT0020');

-- NOTE: No gate_in_receipt rows for CONT0017–CONT0020.
--       No container_positions rows for CONT0017–CONT0020.
--       These containers will appear in the waiting list panel.
