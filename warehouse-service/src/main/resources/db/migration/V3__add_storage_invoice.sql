-- =============================================================
-- V3 - Add storage_invoice table
-- Persists computed billing amounts at gate-out time.
-- One-to-one with gate_out_receipt.
-- =============================================================

CREATE TABLE storage_invoice (
    invoice_id      SERIAL PRIMARY KEY,
    container_id    VARCHAR(20)    NOT NULL UNIQUE,
    gate_out_id     INT            NOT NULL UNIQUE,
    storage_days    INT            NOT NULL,
    daily_rate      NUMERIC(12, 2) NOT NULL,
    base_fee        NUMERIC(12, 2) NOT NULL,
    overdue_penalty NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_fee       NUMERIC(12, 2) NOT NULL,
    is_overdue      BOOLEAN        NOT NULL DEFAULT FALSE,
    overdue_days    INT            NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_id) REFERENCES container(container_id),
    FOREIGN KEY (gate_out_id)  REFERENCES gate_out_receipt(gate_out_id)
);
