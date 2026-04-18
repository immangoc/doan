-- Add customer_id (owner) to container so customers can own containers independently of orders
ALTER TABLE container ADD COLUMN customer_id INTEGER REFERENCES users(user_id);
