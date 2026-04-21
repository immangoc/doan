-- =============================================================
-- V37 - Add YARD_STAFF role (Nhân viên kho bãi) + seed account
-- =============================================================

-- 1. Role
INSERT INTO roles (role_name) VALUES ('YARD_STAFF')
ON CONFLICT (role_name) DO NOTHING;

-- 2. Role → Permissions
--   Nhân viên kho bãi được quyền: xem dashboard, hạ/xuất bãi, cập nhật container, ghi nhận sự cố.
--   KHÔNG có quyền: duyệt đơn, quản lý bãi/catalog, báo cáo, billing, quản lý user.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'YARD_STAFF'
  AND p.permission_name IN (
      'VIEW_DASHBOARD',
      'GATE_IN_OPERATIONS',
      'GATE_OUT_OPERATIONS',
      'MANAGE_CONTAINERS',
      'MANAGE_ALERTS'
  )
ON CONFLICT DO NOTHING;

-- 3. Seed account: nhanvienkho@hungthuy.com / nhanvienkho123
--    (bcrypt $2b$10$ — được Spring BCryptPasswordEncoder chấp nhận)
INSERT INTO users (username, password, full_name, email, phone, status, created_at)
VALUES (
    'nhanvienkho',
    '$2b$10$bhmO1ogQVjQGr9jNnUigK.NlWPLPz5USIPdkyM37RmkRda4kAD192',
    'Nhân viên Kho bãi',
    'nhanvienkho@hungthuy.com',
    '0901234599',
    1,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u, roles r
WHERE u.username = 'nhanvienkho' AND r.role_name = 'YARD_STAFF'
ON CONFLICT DO NOTHING;
