-- Collapse cargo types to 4 canonical kinds: Khô / Lạnh / Dễ Vỡ / Khác.
-- "Hàng Nguy Hiểm" is no longer a standalone category — it becomes "Hàng Khác".
SET client_encoding = 'UTF8';

UPDATE cargo_types
SET cargo_type_name = 'Hàng Khác'
WHERE cargo_type_name = 'Hàng Nguy Hiểm';

-- Ensure the canonical set exists (idempotent on fresh DBs).
INSERT INTO cargo_types (cargo_type_name)
SELECT 'Hàng Khác'
WHERE NOT EXISTS (SELECT 1 FROM cargo_types WHERE cargo_type_name = 'Hàng Khác');
