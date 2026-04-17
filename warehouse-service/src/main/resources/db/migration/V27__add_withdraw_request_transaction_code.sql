ALTER TABLE wallet_withdraw_request
    ADD COLUMN IF NOT EXISTS transaction_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS approved_by INT REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
