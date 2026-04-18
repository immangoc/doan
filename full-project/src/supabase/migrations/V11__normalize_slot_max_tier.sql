-- =============================================================
-- V11 - Normalize max_tier = 4 for ALL blocks
--
-- Target: 4 rows × 8 bays = 32 ground TEUs per block
--   Capacity formula: floor(32 × 0.75) × max_tier = 24 × 4 = 96 slots/zone
--
-- Previous values:
--   Dry   (A*): max_tier = 5  → 120 slots  (too many)
--   Cold  (B*): max_tier = 4  →  96 slots  (already correct)
--   Fragile(C*): max_tier = 3 →  72 slots  (too few)
--   Hazard (D*): max_tier = 3 →  72 slots  (too few)
-- =============================================================
SET client_encoding = 'UTF8';

UPDATE slots
SET max_tier = 4
WHERE block_id IN (SELECT block_id FROM blocks);
