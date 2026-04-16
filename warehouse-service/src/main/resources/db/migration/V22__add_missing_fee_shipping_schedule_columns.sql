ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS cold_storage_surcharge numeric(15,2);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS container_rate_20ft numeric(15,2);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS container_rate_40ft numeric(15,2);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS cost_rate numeric(15,2);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS currency varchar(10);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS early_pickup_fee numeric(15,2);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS free_storage_days int;
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS hazmat_surcharge numeric(15,2);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS lifting_fee_per_move numeric(15,2);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS overdue_penalty_rate numeric(15,2);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS rate_per_kg_by_type text;
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS rate_per_kg_default numeric(15,2);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS storage_multiplier numeric(15,2);
ALTER TABLE fee_config ADD COLUMN IF NOT EXISTS weight_multiplier numeric(15,2);

ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS code varchar(50);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS country varchar(100);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS email varchar(100);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS address varchar(255);

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS ship_type varchar(50);
