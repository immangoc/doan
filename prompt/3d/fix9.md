Fix the failing Flyway migration V10__reset_containers.sql.

Error: DELETE FROM container fails because container_status_history
has a foreign key referencing container.container_id.

The current delete order in V10 is wrong. Fix it to delete in correct
dependency order — children before parents.

Read the migration file first:
- warehouse-service/src/main/resources/db/migration/V10__reset_containers.sql

Then fix the DELETE order to:
1. DELETE FROM storage_invoice (if references gate_out_receipt)
2. DELETE FROM gate_out_receipt (if references container)
3. DELETE FROM container_status_history (references container)
4. DELETE FROM container_positions (references container)
5. DELETE FROM gate_in_receipt (references container)
6. DELETE FROM yard_storage (references container)
7. DELETE FROM order_container (references container)
8. DELETE FROM container (now safe — no more children)

Also check if there are any other tables referencing container
by reading the schema or other migration files — add DELETE statements
for any table not listed above that has container_id FK.

After fixing the order, also add at the top of the SQL:
SET session_replication_role = 'replica';
and at the bottom:
SET session_replication_role = 'DEFAULT';

This temporarily disables FK checks in PostgreSQL as a safety net,
in case the order still misses a table.

Also fix the failed Flyway checksum issue: since V10 already failed
mid-way, Flyway has recorded it as failed. Run this SQL directly
in the DB before restarting:
DELETE FROM flyway_schema_history WHERE version = '10';

Then restart warehouse-service and confirm it starts without errors.