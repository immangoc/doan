-- =============================================================
-- V18 - Pricing multipliers & container-type rates
-- =============================================================

ALTER TABLE fee_config
    ADD COLUMN IF NOT EXISTS storage_multiplier  NUMERIC(6, 4)  DEFAULT 1.0000,
    ADD COLUMN IF NOT EXISTS weight_multiplier   NUMERIC(6, 4)  DEFAULT 1.0000,
    ADD COLUMN IF NOT EXISTS container_rate_20ft NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS container_rate_40ft NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS early_pickup_fee    NUMERIC(12, 2) DEFAULT 0;
