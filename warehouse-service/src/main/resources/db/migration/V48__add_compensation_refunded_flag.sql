-- =============================================================
-- V48 - Track whether compensation has been refunded to customer wallet
--
-- Khi container hỏng được sửa xong (repair_status -> REPAIRED), hệ thống tự
-- động credit compensation_cost vào ví của chủ container (idempotent — chỉ
-- chạy 1 lần dù trigger nhiều lần). Cột này lưu trạng thái đó.
-- =============================================================
SET client_encoding = 'UTF8';

ALTER TABLE container
    ADD COLUMN IF NOT EXISTS compensation_refunded BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE container
    ADD COLUMN IF NOT EXISTS compensation_refunded_at TIMESTAMP;
