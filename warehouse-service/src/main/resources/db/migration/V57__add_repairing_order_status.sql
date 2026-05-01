INSERT INTO order_status (status_name) VALUES ('REPAIRING') ON CONFLICT (status_name) DO NOTHING;
