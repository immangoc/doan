SET client_encoding = 'UTF8';

-- 1. Insert new yard types if safely possible
INSERT INTO yard_types (yard_type_name) 
SELECT 'other' 
WHERE NOT EXISTS (SELECT 1 FROM yard_types WHERE yard_type_name = 'other');

INSERT INTO yard_types (yard_type_name) 
SELECT 'damaged' 
WHERE NOT EXISTS (SELECT 1 FROM yard_types WHERE yard_type_name = 'damaged');

-- 2. Rename yards to match User required names
UPDATE yards SET yard_name = 'Kho hàng khô' WHERE yard_name = 'Bãi Khô A';
UPDATE yards SET yard_name = 'Kho hàng lạnh' WHERE yard_name = 'Bãi Lạnh B';
UPDATE yards SET yard_name = 'Kho hàng dễ vỡ' WHERE yard_name = 'Bãi Đặc Biệt C';
UPDATE yards SET yard_name = 'Kho nguy hiểm' WHERE yard_name = 'Bãi Nguy Hiểm D';

-- 3. Add 'Kho khác' and 'Kho hỏng' if not exist
INSERT INTO yards (yard_type_id, yard_name, address)
SELECT yard_type_id, 'Kho khác', 'Khu E'
FROM yard_types WHERE yard_type_name = 'other'
  AND NOT EXISTS (SELECT 1 FROM yards WHERE yard_name = 'Kho khác');

INSERT INTO yards (yard_type_id, yard_name, address)
SELECT yard_type_id, 'Kho hỏng', 'Khu F'
FROM yard_types WHERE yard_type_name = 'damaged'
  AND NOT EXISTS (SELECT 1 FROM yards WHERE yard_name = 'Kho hỏng');

-- 4. Add zones for the new yards
INSERT INTO yard_zones (yard_id, zone_name, capacity_slots)
SELECT yard_id, 'E1', 30 FROM yards WHERE yard_name = 'Kho khác'
  AND NOT EXISTS (SELECT 1 FROM yard_zones WHERE zone_name = 'E1');

INSERT INTO yard_zones (yard_id, zone_name, capacity_slots)
SELECT yard_id, 'F1', 30 FROM yards WHERE yard_name = 'Kho hỏng'
  AND NOT EXISTS (SELECT 1 FROM yard_zones WHERE zone_name = 'F1');
