-- Add is_locked column to yard_zones for zone-level locking
ALTER TABLE yard_zones ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Ensure slots is_locked column exists (should already exist from V20)
ALTER TABLE slots ALTER COLUMN is_locked SET DEFAULT FALSE;
