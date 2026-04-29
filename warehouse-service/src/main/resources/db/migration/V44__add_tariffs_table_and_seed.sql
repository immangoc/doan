-- =============================================================
-- V44 - Tariffs table & seed for container storage pricing
-- =============================================================

CREATE TABLE IF NOT EXISTS tariffs (
    tariff_id SERIAL PRIMARY KEY,
    tariff_code VARCHAR(50) NOT NULL UNIQUE,
    tariff_name VARCHAR(150) NOT NULL,
    fee_type VARCHAR(50) NOT NULL,
    container_size INT,
    cargo_type_id INT,
    unit_price NUMERIC(15,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE,
    note VARCHAR(255),
    FOREIGN KEY (cargo_type_id) REFERENCES cargo_types(cargo_type_id)
);

-- Ensure "Hàng Khác" exists for mapping
INSERT INTO cargo_types (cargo_type_name)
SELECT 'Hàng Khác'
WHERE NOT EXISTS (
    SELECT 1 FROM cargo_types WHERE cargo_type_name = 'Hàng Khác'
);

-- Seed storage base rates and multipliers
INSERT INTO tariffs (tariff_code, tariff_name, fee_type, container_size, cargo_type_id, unit_price, unit, note)
VALUES
    ('STORAGE_20_DRY', 'Giá lưu kho container 20ft - Hàng khô', 'STORAGE', 20,
        (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô'), 150000, 'PER_DAY', 'Hàng khô'),
    ('STORAGE_20_COLD', 'Giá lưu kho container 20ft - Hàng lạnh', 'STORAGE', 20,
        (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh'), 400000, 'PER_DAY', 'Hàng lạnh'),
    ('STORAGE_20_FRAGILE', 'Giá lưu kho container 20ft - Hàng dễ vỡ', 'STORAGE', 20,
        (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Dễ Vỡ'), 200000, 'PER_DAY', 'Hàng dễ vỡ'),
    ('STORAGE_20_OTHER', 'Giá lưu kho container 20ft - Hàng khác', 'STORAGE', 20,
        (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khác'), 250000, 'PER_DAY', 'Hàng khác'),
    ('STORAGE_40_DRY', 'Giá lưu kho container 40ft - Hàng khô', 'STORAGE', 40,
        (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khô'), 300000, 'PER_DAY', 'Hàng khô'),
    ('STORAGE_40_COLD', 'Giá lưu kho container 40ft - Hàng lạnh', 'STORAGE', 40,
        (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Lạnh'), 700000, 'PER_DAY', 'Hàng lạnh'),
    ('STORAGE_40_FRAGILE', 'Giá lưu kho container 40ft - Hàng dễ vỡ', 'STORAGE', 40,
        (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Dễ Vỡ'), 400000, 'PER_DAY', 'Hàng dễ vỡ'),
    ('STORAGE_40_OTHER', 'Giá lưu kho container 40ft - Hàng khác', 'STORAGE', 40,
        (SELECT cargo_type_id FROM cargo_types WHERE cargo_type_name = 'Hàng Khác'), 500000, 'PER_DAY', 'Hàng khác'),
    ('TIME_MULTIPLIER_LE_5', 'Hệ số thời gian lưu kho <= 5 ngày', 'TIME_MULTIPLIER', NULL, NULL,
        1.0, 'MULTIPLIER', '<= 5 ngày'),
    ('TIME_MULTIPLIER_6_10', 'Hệ số thời gian lưu kho 6 - 10 ngày', 'TIME_MULTIPLIER', NULL, NULL,
        1.5, 'MULTIPLIER', '6 - 10 ngày'),
    ('TIME_MULTIPLIER_GT_10', 'Hệ số thời gian lưu kho > 10 ngày', 'TIME_MULTIPLIER', NULL, NULL,
        2.0, 'MULTIPLIER', '> 10 ngày'),
    ('WEIGHT_MULTIPLIER_LT_10', 'Hệ số trọng lượng < 10 tấn', 'WEIGHT_MULTIPLIER', NULL, NULL,
        1.0, 'MULTIPLIER', '< 10 tấn'),
    ('WEIGHT_MULTIPLIER_10_20', 'Hệ số trọng lượng 10 - 20 tấn', 'WEIGHT_MULTIPLIER', NULL, NULL,
        1.2, 'MULTIPLIER', '10 - 20 tấn'),
    ('WEIGHT_MULTIPLIER_GT_20', 'Hệ số trọng lượng > 20 tấn', 'WEIGHT_MULTIPLIER', NULL, NULL,
        1.5, 'MULTIPLIER', '> 20 tấn'),
    ('LATE_FEE_1_2', 'Phí trễ xuất 1 - 2 ngày', 'LATE_FEE', NULL, NULL,
        500000, 'PER_DAY', '1 - 2 ngày'),
    ('LATE_FEE_3_5', 'Phí trễ xuất 3 - 5 ngày', 'LATE_FEE', NULL, NULL,
        1000000, 'PER_DAY', '3 - 5 ngày'),
    ('LATE_FEE_GT_5', 'Phí trễ xuất > 5 ngày', 'LATE_FEE', NULL, NULL,
        2000000, 'PER_DAY', '> 5 ngày'),
    ('EARLY_FEE_1', 'Phí xuất sớm (Ưu tiên thấp, sớm 1 ngày)', 'EARLY_FEE', NULL, NULL,
        300000, 'PER_CONTAINER', 'Ưu tiên thấp (sớm 1 ngày)'),
    ('EARLY_FEE_2_3', 'Phí xuất sớm (Ưu tiên trung bình, sớm 2 - 3 ngày)', 'EARLY_FEE', NULL, NULL,
        700000, 'PER_CONTAINER', 'Ưu tiên trung bình (sớm 2 - 3 ngày)'),
    ('EARLY_FEE_GT_3', 'Phí xuất sớm (Ưu tiên cao, sớm > 3 ngày)', 'EARLY_FEE', NULL, NULL,
        1500000, 'PER_CONTAINER', 'Ưu tiên cao (sớm > 3 ngày)')
ON CONFLICT (tariff_code) DO UPDATE
SET tariff_name = EXCLUDED.tariff_name,
    fee_type = EXCLUDED.fee_type,
    container_size = EXCLUDED.container_size,
    cargo_type_id = EXCLUDED.cargo_type_id,
    unit_price = EXCLUDED.unit_price,
    unit = EXCLUDED.unit,
    note = EXCLUDED.note;
