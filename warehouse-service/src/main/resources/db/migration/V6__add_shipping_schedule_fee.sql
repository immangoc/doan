-- =============================================================
-- V6 - Shipping companies, Schedules, Fee config
-- =============================================================

-- =========================
-- 1. SHIPPING COMPANIES
-- =========================
CREATE TABLE shipping_companies (
    company_id  SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    phone       VARCHAR(30),
    email       VARCHAR(100),
    address     VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 2. SCHEDULES
-- =========================
CREATE TABLE schedules (
    schedule_id  SERIAL PRIMARY KEY,
    company_name VARCHAR(100),
    ship_name    VARCHAR(100),
    type         VARCHAR(20)  DEFAULT 'import',
    time_start   TIMESTAMP,
    time_end     TIMESTAMP,
    location     VARCHAR(255),
    containers   INT          DEFAULT 0,
    status       VARCHAR(30)  DEFAULT 'scheduled',
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 3. FEE CONFIG (single-row)
-- =========================
CREATE TABLE fee_config (
    config_id               SERIAL PRIMARY KEY,
    currency                VARCHAR(10)    DEFAULT 'VND',
    cost_rate               NUMERIC(6, 4)  DEFAULT 0.3500,
    rate_per_kg_default     NUMERIC(12, 2) DEFAULT 1000.00,
    rate_per_kg_by_type     TEXT           DEFAULT '{}',
    updated_at              TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- Seed the single default row
INSERT INTO fee_config (currency, cost_rate, rate_per_kg_default, rate_per_kg_by_type)
VALUES ('VND', 0.35, 1000, '{}');
