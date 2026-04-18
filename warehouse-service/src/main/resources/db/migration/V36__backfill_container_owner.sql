-- Backfill customer_id for containers that were linked to orders before V21
-- Each container gets the customer_id from its most recent order
WITH latest AS (
    SELECT DISTINCT ON (oc.container_id)
           oc.container_id,
           o.customer_id
    FROM order_container oc
    JOIN orders o ON o.order_id = oc.order_id
    WHERE o.customer_id IS NOT NULL
    ORDER BY oc.container_id, o.order_id DESC
)
UPDATE container
SET customer_id = latest.customer_id
FROM latest
WHERE container.container_id = latest.container_id
  AND container.customer_id IS NULL;
