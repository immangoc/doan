-- =============================================================
-- V10 - Reset all container data for a clean start.
--
-- After this migration the only way to add containers is through
-- the customer UI (do-an-full).  Reference data, yards, zones,
-- blocks, slots, users, vessels, voyages, manifests, and orders
-- are all preserved.
--
-- session_replication_role = 'replica' disables FK triggers in
-- PostgreSQL as a safety net while we delete in dependency order.
-- =============================================================
SET client_encoding = 'UTF8';
SET session_replication_role = 'replica';

-- Delete in FK-safe order (children before parents)
-- storage_invoice references both container and gate_out_receipt
DELETE FROM storage_invoice;
-- gate_out_receipt references container
DELETE FROM gate_out_receipt;
-- container_status_history references container
DELETE FROM container_status_history;
-- export_priority references container
DELETE FROM export_priority;
-- container_positions references container
DELETE FROM container_positions;
-- gate_in_receipt references container
DELETE FROM gate_in_receipt;
-- yard_storage references container
DELETE FROM yard_storage;
-- order_container references container
DELETE FROM order_container;
-- container is now safe to delete
DELETE FROM container;

SET session_replication_role = 'origin';
