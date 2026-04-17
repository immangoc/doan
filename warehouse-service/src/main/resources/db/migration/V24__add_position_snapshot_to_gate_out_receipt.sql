-- Snapshot the container's last known position (yard/zone/block/slot) onto
-- the gate-out receipt so exported-container listings can still display it
-- after the ContainerPosition row is deleted.
ALTER TABLE gate_out_receipt
    ADD COLUMN last_yard_name  VARCHAR(100) NULL,
    ADD COLUMN last_zone_name  VARCHAR(100) NULL,
    ADD COLUMN last_block_name VARCHAR(100) NULL,
    ADD COLUMN last_row_no     INT          NULL,
    ADD COLUMN last_bay_no     INT          NULL,
    ADD COLUMN last_tier       INT          NULL;
