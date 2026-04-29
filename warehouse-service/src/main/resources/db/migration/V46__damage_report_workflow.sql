-- =============================================================
-- V46 - Damage report workflow (Pha 1 + Pha 2)
--
-- Pha 1 (báo hỏng): chỉ đánh dấu, container chưa di chuyển vật lý.
--   container.status -> DAMAGED_PENDING
--   damage_report row được tạo với reportStatus = PENDING
--
-- Pha 2 (chuyển vào kho hỏng): xác nhận + relocate (BFS đảo container chặn).
--   plan được lưu vào damage_report.plan_json (audit + replay).
--   container.status -> DAMAGED khi hoàn tất.
-- =============================================================
SET client_encoding = 'UTF8';

-- 1. Status mới cho giai đoạn "đã báo, chưa chuyển".
INSERT INTO container_statuses (status_name) VALUES ('DAMAGED_PENDING')
ON CONFLICT (status_name) DO NOTHING;

-- 2. Bảng damage_report
CREATE TABLE IF NOT EXISTS damage_report (
    report_id      SERIAL       PRIMARY KEY,
    container_id   VARCHAR(20)  NOT NULL,
    severity       VARCHAR(20),                 -- MINOR / MAJOR / CRITICAL
    reason         VARCHAR(500),
    photo_urls     TEXT,                        -- JSON array of urls
    reported_by    INT,                         -- user_id (nullable)
    reported_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    report_status  VARCHAR(20)  NOT NULL DEFAULT 'PENDING',  -- PENDING / RELOCATING / STORED / CANCELLED
    plan_json      TEXT,                        -- JSON: list of moves executed
    completed_at   TIMESTAMP,
    FOREIGN KEY (container_id) REFERENCES container(container_id),
    FOREIGN KEY (reported_by)  REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_damage_report_status
    ON damage_report(report_status);
CREATE INDEX IF NOT EXISTS idx_damage_report_container
    ON damage_report(container_id);

-- 3. Bảng container_position_history để truy vết các move (audit).
CREATE TABLE IF NOT EXISTS container_position_history (
    history_id    SERIAL      PRIMARY KEY,
    container_id  VARCHAR(20) NOT NULL,
    from_slot_id  INT,
    from_tier     INT,
    to_slot_id    INT         NOT NULL,
    to_tier       INT         NOT NULL,
    reason        VARCHAR(50),                  -- DAMAGE_RELOCATION / RELOCATION / GATE_IN ...
    damage_report_id INT,
    moved_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_id)     REFERENCES container(container_id),
    FOREIGN KEY (from_slot_id)     REFERENCES slots(slot_id),
    FOREIGN KEY (to_slot_id)       REFERENCES slots(slot_id),
    FOREIGN KEY (damage_report_id) REFERENCES damage_report(report_id)
);

CREATE INDEX IF NOT EXISTS idx_position_history_container
    ON container_position_history(container_id);
CREATE INDEX IF NOT EXISTS idx_position_history_damage
    ON container_position_history(damage_report_id);
