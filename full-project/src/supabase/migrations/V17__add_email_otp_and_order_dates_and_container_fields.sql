-- =============================================================
-- V17 - OTP tokens, order import/export dates,
--       container declared_value, shipping company code/country,
--       schedule ship_type, fee config new rate fields
-- =============================================================

-- 1. Email OTP verification tokens
CREATE TABLE email_otp_tokens (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(100) NOT NULL,
    otp        VARCHAR(10)  NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    used       BOOLEAN      DEFAULT FALSE,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 2. Order import/export dates
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS import_date DATE,
    ADD COLUMN IF NOT EXISTS export_date DATE;

-- 3. Container declared value
ALTER TABLE container
    ADD COLUMN IF NOT EXISTS declared_value NUMERIC(15, 2);

-- 4. Shipping company code and country
ALTER TABLE shipping_companies
    ADD COLUMN IF NOT EXISTS code    VARCHAR(20),
    ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- 5. Schedule ship type
ALTER TABLE schedules
    ADD COLUMN IF NOT EXISTS ship_type VARCHAR(50);

-- 6. Fee config additional rate fields
ALTER TABLE fee_config
    ADD COLUMN IF NOT EXISTS lifting_fee_per_move   NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS overdue_penalty_rate   NUMERIC(6, 4)  DEFAULT 0.0500,
    ADD COLUMN IF NOT EXISTS cold_storage_surcharge NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hazmat_surcharge       NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS free_storage_days      INT            DEFAULT 0;
