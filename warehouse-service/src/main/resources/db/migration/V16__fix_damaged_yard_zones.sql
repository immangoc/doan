SET client_encoding = 'UTF8';

-- 1. Remove Zone C from 'Kho hỏng' if it was created
DELETE FROM container_positions WHERE slot_id IN (
    SELECT slot_id FROM slots WHERE block_id IN (
        SELECT block_id FROM blocks WHERE zone_id IN (
            SELECT zone_id FROM yard_zones WHERE zone_name = 'Zone C' AND yard_id IN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hỏng')
        )
    )
);
DELETE FROM slots WHERE block_id IN (
    SELECT block_id FROM blocks WHERE zone_id IN (
        SELECT zone_id FROM yard_zones WHERE zone_name = 'Zone C' AND yard_id IN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hỏng')
    )
);
DELETE FROM blocks WHERE zone_id IN (
    SELECT zone_id FROM yard_zones WHERE zone_name = 'Zone C' AND yard_id IN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hỏng')
);
DELETE FROM alert WHERE zone_id IN (
    SELECT zone_id FROM yard_zones WHERE zone_name = 'Zone C' AND yard_id IN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hỏng')
);
DELETE FROM yard_zones WHERE zone_name = 'Zone C' AND yard_id IN (SELECT yard_id FROM yards WHERE yard_name = 'Kho hỏng');
