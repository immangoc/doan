-- V21 - Wallet + topup payments

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE wallets (
    wallet_id  SERIAL PRIMARY KEY,
    user_id    INT UNIQUE NOT NULL,
    balance    NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    INT NOT NULL,
    amount     NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    payos_order_code     BIGINT UNIQUE,
    payos_payment_link_id VARCHAR(100),
    payos_transaction_id  VARCHAR(100) UNIQUE,
    status     VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED')),
    response_data JSONB,
    paid_at    TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_payments_user_id ON payments(user_id);

CREATE TABLE wallet_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id  INT NOT NULL,
    payment_id UUID,
    type       VARCHAR(20) NOT NULL
        CHECK (type IN ('TOPUP', 'REFUND', 'PAYMENT', 'ADJUST')),
    amount     NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(15,2) NOT NULL CHECK (balance_after >= 0),
    note       VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id),
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
);

CREATE UNIQUE INDEX ux_wallet_tx_payment ON wallet_transactions(payment_id);
CREATE INDEX idx_wallet_tx_wallet_id ON wallet_transactions(wallet_id);

CREATE TABLE withdraw_requests (
    withdraw_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   INT NOT NULL,
    amount    NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    status    VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
    bank_name    VARCHAR(100) NOT NULL,
    bank_account VARCHAR(100) NOT NULL,
    reject_reason VARCHAR(255),
    processed_by INT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (processed_by) REFERENCES users(user_id)
);
