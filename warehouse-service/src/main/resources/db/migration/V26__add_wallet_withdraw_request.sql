CREATE TABLE IF NOT EXISTS wallet_withdraw_request (
    request_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    reason VARCHAR(500) NOT NULL,
    bank_account VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_withdraw_request_user_created
    ON wallet_withdraw_request (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_withdraw_request_status_created
    ON wallet_withdraw_request (status, created_at DESC);
