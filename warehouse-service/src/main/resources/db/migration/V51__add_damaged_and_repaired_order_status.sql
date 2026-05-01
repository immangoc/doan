INSERT INTO order_status (status_name) VALUES ('DAMAGED'), ('REPAIRED') ON CONFLICT (status_name) DO NOTHING;
