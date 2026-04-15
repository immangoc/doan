-- =============================================================
-- V20 - Slot locking (khóa/mở vị trí)
-- =============================================================

ALTER TABLE slots ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE slots ADD COLUMN lock_reason VARCHAR(255);
ALTER TABLE slots ADD COLUMN locked_at TIMESTAMP;

