-- =============================================================
-- V43 - Limit project to 4 tiers maximum
-- Updates all slots that have max_tier > 4 to max_tier = 4
-- (Affects the Dry zone blocks A1-A4 which were previously 5)
-- =============================================================
SET client_encoding = 'UTF8';

UPDATE slots
SET max_tier = 4
WHERE max_tier > 4;
