ALTER TABLE damage_report ADD COLUMN repair_status VARCHAR(50);
ALTER TABLE damage_report ADD COLUMN repair_date TIMESTAMP;
ALTER TABLE damage_report ADD COLUMN repair_cost DECIMAL(15,2);
ALTER TABLE damage_report ADD COLUMN compensation_cost DECIMAL(15,2);
ALTER TABLE damage_report ADD COLUMN compensation_refunded BOOLEAN DEFAULT FALSE;
ALTER TABLE damage_report ADD COLUMN compensation_refunded_at TIMESTAMP;
