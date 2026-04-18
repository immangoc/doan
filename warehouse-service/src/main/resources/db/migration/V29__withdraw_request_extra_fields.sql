ALTER TABLE withdraw_requests
    ADD COLUMN IF NOT EXISTS reason           VARCHAR(500),
    ADD COLUMN IF NOT EXISTS transaction_code VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user_created
    ON withdraw_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status_created
    ON withdraw_requests (status, created_at DESC);
