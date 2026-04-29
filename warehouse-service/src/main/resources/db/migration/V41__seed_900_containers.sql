-- =============================================================
-- V41 - Seed 900 containers with full information
-- Distributed across all cargo types and container types
-- All containers start as AVAILABLE (registered, not yet in yard)
-- =============================================================
SET client_encoding = 'UTF8';

-- ─────────────────────────────────────────────────────────────
-- Lookup IDs into variables via CTEs
-- Container types:  20FT / 40FT
-- Cargo types:      Hàng Khô / Hàng Lạnh / Hàng Dễ Vỡ / Hàng Khác
-- Attributes:       Tiêu chuẩn / Cần làm lạnh / Dễ vỡ / Nguy hiểm / Quá khổ
-- Status:           AVAILABLE
-- ─────────────────────────────────────────────────────────────

INSERT INTO container (
    container_id, manifest_id, container_type_id, status_id,
    cargo_type_id, attribute_id, gross_weight, seal_number,
    note, created_at, customer_id
)
SELECT
    -- Container ID: HTHU + 7-digit zero-padded number (e.g. HTHU0000001)
    'HTHU' || LPAD(n::TEXT, 7, '0'),

    -- Rotate manifest: use existing manifests (IDs from V5 test data)
    -- We pick from the 10 manifests seeded in V5
    (SELECT manifest_id FROM manifest ORDER BY manifest_id OFFSET (n % 10) LIMIT 1),

    -- Container type: alternate 20FT (id lookup) and 40FT
    CASE WHEN n % 2 = 0
        THEN (SELECT container_type_id FROM container_types WHERE container_type_name = '20FT')
        ELSE (SELECT container_type_id FROM container_types WHERE container_type_name = '40FT')
    END,

    -- Status: all AVAILABLE
    (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE'),

    -- Cargo type distribution:
    --   0-250 (28%) = Hàng Khô
    --   251-500 (28%) = Hàng Lạnh
    --   501-750 (28%) = Hàng Dễ Vỡ
    --   751-900 (16%) = Hàng Khác
    CASE
        WHEN n <= 250 THEN (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô')
        WHEN n <= 500 THEN (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh')
        WHEN n <= 750 THEN (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Dễ Vỡ')
        ELSE               (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khác')
    END,

    -- Attribute aligned with cargo type
    CASE
        WHEN n <= 250 THEN (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Tiêu chuẩn')
        WHEN n <= 500 THEN (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Cần làm lạnh')
        WHEN n <= 750 THEN (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Dễ vỡ')
        ELSE               (SELECT attribute_id FROM cargo_attributes WHERE attribute_name = 'Quá khổ')
    END,

    -- Gross weight: varies between 5000 and 30000 kg
    ROUND((5000 + (n * 27.77) % 25000)::NUMERIC, 2),

    -- Seal number: SL-HTHU-XXXXXXX
    'SL-HTHU-' || LPAD(n::TEXT, 7, '0'),

    -- Note: descriptive note per cargo type
    CASE
        WHEN n <= 250 THEN 'Container hàng khô tiêu chuẩn - Lô ' || ((n / 50) + 1)
        WHEN n <= 500 THEN 'Container hàng lạnh - Duy trì nhiệt độ -18°C - Lô ' || (((n - 250) / 50) + 1)
        WHEN n <= 750 THEN 'Container hàng dễ vỡ - Xử lý cẩn thận - Lô ' || (((n - 500) / 50) + 1)
        ELSE               'Container hàng khác - Hàng đặc biệt - Lô ' || (((n - 750) / 30) + 1)
    END,

    -- created_at: spread over Jan-Apr 2026
    '2026-01-01'::TIMESTAMP + (n * INTERVAL '2 hours' + (n % 24) * INTERVAL '5 minutes'),

    -- customer_id: NULL (unassigned, will be assigned by customer registration)
    NULL

FROM generate_series(1, 900) AS n
ON CONFLICT (container_id) DO NOTHING;
