-- =============================================================
-- V20 - Fix free_storage_days: correct existing row from 0 → 3
--       and update column default to 3
-- =============================================================

-- Update existing fee_config row(s) where free_storage_days was
-- incorrectly set to 0 by V17's DEFAULT 0
UPDATE fee_config
SET free_storage_days = 3
WHERE free_storage_days = 0 OR free_storage_days IS NULL;

-- Correct the column default for future inserts
ALTER TABLE fee_config
    ALTER COLUMN free_storage_days SET DEFAULT 3;
