SET client_encoding = 'UTF8';

-- 1. Remove container positions in the hazard yard
DELETE FROM container_positions WHERE slot_id IN (
    SELECT slot_id FROM slots WHERE block_id IN (
        SELECT block_id FROM blocks WHERE zone_id IN (
            SELECT zone_id FROM yard_zones WHERE yard_id IN (
                SELECT yard_id FROM yards WHERE yard_name IN ('Bãi Nguy Hiểm D', 'Kho nguy hiểm')
            )
        )
    )
);

-- 2. Remove slots in the hazard yard
DELETE FROM slots WHERE block_id IN (
    SELECT block_id FROM blocks WHERE zone_id IN (
        SELECT zone_id FROM yard_zones WHERE yard_id IN (
            SELECT yard_id FROM yards WHERE yard_name IN ('Bãi Nguy Hiểm D', 'Kho nguy hiểm')
        )
    )
);

-- 3. Remove blocks in the hazard yard
DELETE FROM blocks WHERE zone_id IN (
    SELECT zone_id FROM yard_zones WHERE yard_id IN (
        SELECT yard_id FROM yards WHERE yard_name IN ('Bãi Nguy Hiểm D', 'Kho nguy hiểm')
    )
);

-- 4. Remove alerts referencing the zones
DELETE FROM alert WHERE zone_id IN (
    SELECT zone_id FROM yard_zones WHERE yard_id IN (
        SELECT yard_id FROM yards WHERE yard_name IN ('Bãi Nguy Hiểm D', 'Kho nguy hiểm')
    )
);

-- 5. Remove zones in the hazard yard
DELETE FROM yard_zones WHERE yard_id IN (
    SELECT yard_id FROM yards WHERE yard_name IN ('Bãi Nguy Hiểm D', 'Kho nguy hiểm')
);

-- 6. Remove yard_storage referencing the yard
DELETE FROM yard_storage WHERE yard_id IN (
    SELECT yard_id FROM yards WHERE yard_name IN ('Bãi Nguy Hiểm D', 'Kho nguy hiểm')
);

-- 7. Remove the yard itself
DELETE FROM yards WHERE yard_name IN ('Bãi Nguy Hiểm D', 'Kho nguy hiểm');

-- 8. Remove the yard_type mapping if it exists
DELETE FROM yard_types WHERE yard_type_name = 'hazard';
