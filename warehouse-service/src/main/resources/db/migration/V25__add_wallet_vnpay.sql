CREATE TABLE IF NOT EXISTS wallet_account (
    wallet_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(user_id),
    balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    hold_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_transaction (
    transaction_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    reference_code VARCHAR(100) NOT NULL UNIQUE,
    transaction_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    provider VARCHAR(50),
    provider_order_id VARCHAR(100),
    provider_transaction_id VARCHAR(100),
    raw_payload TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_transaction_user_id_created_at
    ON wallet_transaction (user_id, created_at DESC);
