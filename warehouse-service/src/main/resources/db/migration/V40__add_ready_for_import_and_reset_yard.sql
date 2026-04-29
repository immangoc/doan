-- =============================================================
-- V40
-- 1. Add new order status READY_FOR_IMPORT ("Chờ nhập kho").
--    Admin can move an order from WAITING_CHECKIN / LATE_CHECKIN
--    to this state when the customer confirms the container is
--    ready to be brought in. The 3D Gate-In waiting list pulls
--    only orders in this state.
--
-- 2. Reset all in-yard state so the yard starts empty again.
--    Container records owned by customers are kept; only the
--    physical placement and receipt history is wiped. Any orders
--    that were in IMPORTED / STORED are rolled back to
--    READY_FOR_IMPORT so they show up in the gate-in list again.
--    EXPORTED orders are kept untouched (historical record).
-- =============================================================
SET client_encoding = 'UTF8';

-- 1. New order status
INSERT INTO order_status (status_name) VALUES
    ('READY_FOR_IMPORT')
ON CONFLICT (status_name) DO NOTHING;

-- 2. Reset in-yard state
SET session_replication_role = 'replica';

DELETE FROM storage_invoice;
DELETE FROM gate_out_receipt;
DELETE FROM container_status_history;
DELETE FROM export_priority;
DELETE FROM container_positions;
DELETE FROM gate_in_receipt;
DELETE FROM yard_storage;

-- Roll back any "in-yard" orders to READY_FOR_IMPORT so the
-- waiting list and stats are consistent with the empty yard.
UPDATE orders
SET status_id = (SELECT status_id FROM order_status WHERE status_name = 'READY_FOR_IMPORT')
WHERE status_id IN (
    SELECT status_id FROM order_status
    WHERE status_name IN ('IMPORTED', 'STORED')
);

-- Move any container row that was IN_YARD / GATE_IN / GATE_OUT back to
-- AVAILABLE so it can be gated in again. The lookup table is named
-- container_statuses (plural, seeded in V2) and uses AVAILABLE as the
-- "registered but not in the yard" state.
UPDATE container
SET status_id = COALESCE(
    (SELECT status_id FROM container_statuses WHERE status_name = 'AVAILABLE'),
    status_id)
WHERE status_id IN (
    SELECT status_id FROM container_statuses
    WHERE status_name IN ('IN_YARD', 'GATE_IN', 'GATE_OUT')
);

-- Free any locked slots
UPDATE slots SET is_locked = FALSE, lock_reason = NULL WHERE is_locked = TRUE;

SET session_replication_role = 'origin';
