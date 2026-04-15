-- Add damage tracking columns to container
ALTER TABLE container ADD COLUMN repair_status VARCHAR(50);
ALTER TABLE container ADD COLUMN repair_date TIMESTAMP;
ALTER TABLE container ADD COLUMN compensation_cost DECIMAL(15,2);
