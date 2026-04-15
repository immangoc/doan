-- =============================================================
-- V2 - Seed Reference / Lookup Data
-- =============================================================

-- Roles
INSERT INTO roles (role_name) VALUES
    ('ADMIN'),
    ('OPERATOR'),
    ('CUSTOMER');

-- Permissions
INSERT INTO permissions (permission_name, description) VALUES
    ('VIEW_DASHBOARD',       'View dashboard statistics'),
    ('MANAGE_BOOKINGS',      'Create and manage own bookings'),
    ('APPROVE_BOOKINGS',     'Approve or reject customer bookings'),
    ('MANAGE_CONTAINERS',    'Create and update container records'),
    ('MANAGE_YARD',          'Manage yard structure and slot assignments'),
    ('GATE_IN_OPERATIONS',   'Execute gate-in operations'),
    ('GATE_OUT_OPERATIONS',  'Execute gate-out operations'),
    ('MANAGE_ALERTS',        'View and resolve alerts'),
    ('VIEW_REPORTS',         'View and export system reports'),
    ('MANAGE_USERS',         'Create, update, delete users'),
    ('MANAGE_CATALOG',       'Manage reference data (container types, cargo types, etc.)'),
    ('SYSTEM_ADMIN',         'Full system administration access'),
    ('VIEW_VESSEL_SCHEDULE', 'View vessel and voyage schedules'),
    ('MANAGE_BILLING',       'Manage fee configuration and invoices');

-- Role → Permission mapping
-- CUSTOMER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = 'CUSTOMER'
  AND p.permission_name IN ('VIEW_DASHBOARD', 'MANAGE_BOOKINGS', 'VIEW_VESSEL_SCHEDULE');

-- OPERATOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = 'OPERATOR'
  AND p.permission_name IN (
      'VIEW_DASHBOARD', 'APPROVE_BOOKINGS', 'MANAGE_CONTAINERS',
      'MANAGE_YARD', 'GATE_IN_OPERATIONS', 'GATE_OUT_OPERATIONS',
      'MANAGE_ALERTS', 'VIEW_REPORTS', 'VIEW_VESSEL_SCHEDULE', 'MANAGE_BILLING'
  );

-- ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = 'ADMIN';

-- Container statuses
INSERT INTO container_statuses (status_name) VALUES
    ('AVAILABLE'),
    ('GATE_IN'),
    ('IN_YARD'),
    ('GATE_OUT'),
    ('EXPORTED'),
    ('DAMAGED'),
    ('OVERDUE'),
    ('CANCELLED');

-- Container types
INSERT INTO container_types (container_type_name) VALUES
    ('20FT'),
    ('40FT');

-- Cargo types (must match yard_type logic in algorithm)
INSERT INTO cargo_types (cargo_type_name) VALUES
    ('Hàng Khô'),
    ('Hàng Lạnh'),
    ('Hàng Dễ Vỡ'),
    ('Hàng Nguy Hiểm');

-- Cargo attributes
INSERT INTO cargo_attributes (attribute_name) VALUES
    ('Tiêu chuẩn'),
    ('Cần làm lạnh'),
    ('Dễ vỡ'),
    ('Nguy hiểm'),
    ('Quá khổ');

-- Yard types (must align with cargo_types for algorithm pre-filter)
INSERT INTO yard_types (yard_type_name) VALUES
    ('dry'),
    ('cold'),
    ('fragile'),
    ('hazard');

-- Block types
INSERT INTO block_types (block_type_name) VALUES
    ('STANDARD'),
    ('REEFER'),
    ('HAZMAT');

-- Order statuses
INSERT INTO order_status (status_name) VALUES
    ('PENDING'),
    ('APPROVED'),
    ('REJECTED'),
    ('CANCEL_REQUESTED'),
    ('CANCELLED');

-- Bill of lading statuses
INSERT INTO bill_of_lading_status (status_name) VALUES
    ('DRAFT'),
    ('ISSUED'),
    ('CANCELLED');

-- Alert levels
INSERT INTO alert_level (level_name) VALUES
    ('INFO'),
    ('WARNING'),
    ('CRITICAL');

-- Chat room types
INSERT INTO chat_room_type (type_name) VALUES
    ('SUPPORT'),
    ('GROUP');
