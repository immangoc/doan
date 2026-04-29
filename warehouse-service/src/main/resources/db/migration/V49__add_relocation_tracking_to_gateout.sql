-- V49: Add relocation tracking columns to gate_out_receipt
ALTER TABLE gate_out_receipt ADD COLUMN IF NOT EXISTS relocation_plan_json TEXT;
ALTER TABLE gate_out_receipt ADD COLUMN IF NOT EXISTS relocation_message VARCHAR(1000);
