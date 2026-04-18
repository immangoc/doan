-- One-time fix: earlier code debited wallets when a withdraw request was
-- created in PENDING state. The logic now debits only on approve, so we
-- refund the balance for every still-PENDING request.

UPDATE wallets w
SET balance    = balance + wr.amount,
    updated_at = CURRENT_TIMESTAMP
FROM withdraw_requests wr
WHERE wr.status = 'PENDING'
  AND wr.user_id = w.user_id;

INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, note, created_at)
SELECT w.wallet_id,
       'REFUND',
       wr.amount,
       w.balance,
       'Refund for pending withdraw request ' || wr.withdraw_id,
       CURRENT_TIMESTAMP
FROM withdraw_requests wr
JOIN wallets w ON w.user_id = wr.user_id
WHERE wr.status = 'PENDING';
