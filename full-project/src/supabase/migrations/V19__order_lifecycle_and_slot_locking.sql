-- =============================================================
-- V19 - Order lifecycle statuses + slot locking
-- =============================================================

-- 1. New order statuses for full lifecycle
INSERT INTO order_status (status_name) VALUES
    ('WAITING_CHECKIN'),
    ('LATE_CHECKIN'),
    ('IMPORTED'),
    ('STORED'),
    ('EXPORTED')
ON CONFLICT (status_name) DO NOTHING;

-- 2. Slot locking support
ALTER TABLE slots
    ADD COLUMN IF NOT EXISTS is_locked   BOOLEAN      DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS lock_reason VARCHAR(255);
