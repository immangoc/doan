-- =============================================================
-- V8 - Fill each block to a 4-row × 8-bay slot grid
--
-- The 3D scene visual layout is hardcoded for 4 rows × 8 columns
-- (colX() handles bays 1-8, rowZ() handles rows 1-4).
-- With fewer slots the ground plate still renders at full size but
-- containers only appear in the top-left corner.
--
-- Fix: add missing slots so every block has row_no 1-4 × bay_no 1-8 = 32 slots.
-- max_tier per block type:
--   Dry (A*)  → 4   Cold (B*)  → 4   Fragile (C*)  → 3   Hazard (D*)  → 3
-- Existing slots are preserved via NOT EXISTS guard.
-- =============================================================
SET client_encoding = 'UTF8';

-- ─── Dry zone blocks (max_tier = 4) ─────────────────────────────────────────

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 4
FROM blocks b
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE b.block_name = 'A1-BLK1'
  AND NOT EXISTS (
    SELECT 1 FROM slots s
    WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 4
FROM blocks b
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE b.block_name = 'A2-BLK1'
  AND NOT EXISTS (
    SELECT 1 FROM slots s
    WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 4
FROM blocks b
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE b.block_name = 'A3-BLK1'
  AND NOT EXISTS (
    SELECT 1 FROM slots s
    WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 4
FROM blocks b
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE b.block_name = 'A4-BLK1'
  AND NOT EXISTS (
    SELECT 1 FROM slots s
    WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

-- ─── Cold / Reefer zone blocks (max_tier = 4) ────────────────────────────────

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 4
FROM blocks b
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE b.block_name = 'B1-BLK1'
  AND NOT EXISTS (
    SELECT 1 FROM slots s
    WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 4
FROM blocks b
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE b.block_name = 'B2-BLK1'
  AND NOT EXISTS (
    SELECT 1 FROM slots s
    WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

-- ─── Fragile zone blocks (max_tier = 3) ─────────────────────────────────────

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 3
FROM blocks b
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE b.block_name = 'C1-BLK1'
  AND NOT EXISTS (
    SELECT 1 FROM slots s
    WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 3
FROM blocks b
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE b.block_name = 'C2-BLK1'
  AND NOT EXISTS (
    SELECT 1 FROM slots s
    WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

-- ─── Hazard zone blocks (max_tier = 3) ──────────────────────────────────────

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 3
FROM blocks b
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE b.block_name = 'D1-BLK1'
  AND NOT EXISTS (
    SELECT 1 FROM slots s
    WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );

INSERT INTO slots (block_id, row_no, bay_no, max_tier)
SELECT b.block_id, r.row_no, c.bay_no, 3
FROM blocks b
CROSS JOIN generate_series(1, 4) AS r(row_no)
CROSS JOIN generate_series(1, 8) AS c(bay_no)
WHERE b.block_name = 'D2-BLK1'
  AND NOT EXISTS (
    SELECT 1 FROM slots s
    WHERE s.block_id = b.block_id AND s.row_no = r.row_no AND s.bay_no = c.bay_no
  );
