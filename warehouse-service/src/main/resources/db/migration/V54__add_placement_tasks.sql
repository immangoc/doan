CREATE TABLE IF NOT EXISTS placement_tasks (
    task_id SERIAL PRIMARY KEY,
    container_id VARCHAR(50) NOT NULL REFERENCES container(container_id),
    slot_id INTEGER NOT NULL REFERENCES slots(slot_id),
    tier INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
