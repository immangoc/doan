-- =============================================================
-- V1 - Initial Schema
-- HT Port Logistics - Warehouse Management System
-- =============================================================
SET client_encoding = 'UTF8';

-- =========================
-- 1. AUTH & USER
-- =========================
CREATE TABLE roles (
    role_id   SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE permissions (
    permission_id   SERIAL PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    description     VARCHAR(255)
);

CREATE TABLE role_permissions (
    role_id       INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id)       REFERENCES roles(role_id),
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);

CREATE TABLE users (
    user_id    SERIAL PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    full_name  VARCHAR(100),
    email      VARCHAR(100) UNIQUE,
    phone      VARCHAR(20),
    status     SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE user_profiles (
    profile_id    SERIAL PRIMARY KEY,
    user_id       INT NOT NULL UNIQUE,
    gender        VARCHAR(10),
    date_of_birth DATE,
    national_id   VARCHAR(30),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE user_addresses (
    address_id SERIAL PRIMARY KEY,
    user_id    INT NOT NULL,
    address    VARCHAR(255),
    ward       VARCHAR(100),
    district   VARCHAR(100),
    city       VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE system_logs (
    log_id      SERIAL PRIMARY KEY,
    user_id     INT,
    action      VARCHAR(255),
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- =========================
-- 2. VESSEL & VOYAGE
-- =========================
CREATE TABLE vessels (
    vessel_id     SERIAL PRIMARY KEY,
    vessel_name   VARCHAR(100) NOT NULL,
    shipping_line VARCHAR(100)
);

CREATE TABLE voyages (
    voyage_id              SERIAL PRIMARY KEY,
    vessel_id              INT NOT NULL,
    voyage_no              VARCHAR(50),
    port_of_loading        VARCHAR(100),
    port_of_discharge      VARCHAR(100),
    estimated_time_arrival TIMESTAMP,
    actual_time_arrival    TIMESTAMP,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vessel_id) REFERENCES vessels(vessel_id)
);

CREATE TABLE manifest (
    manifest_id  SERIAL PRIMARY KEY,
    voyage_id    INT NOT NULL,
    created_date DATE DEFAULT CURRENT_DATE,
    note         VARCHAR(255),
    FOREIGN KEY (voyage_id) REFERENCES voyages(voyage_id)
);

-- =========================
-- 3. CONTAINER & CARGO
-- =========================
CREATE TABLE container_types (
    container_type_id   SERIAL PRIMARY KEY,
    container_type_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE container_statuses (
    status_id   SERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE cargo_types (
    cargo_type_id   SERIAL PRIMARY KEY,
    cargo_type_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE cargo_attributes (
    attribute_id   SERIAL PRIMARY KEY,
    attribute_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE container (
    container_id       VARCHAR(20) PRIMARY KEY,
    manifest_id        INT,
    container_type_id  INT,
    status_id          INT,
    cargo_type_id      INT,
    attribute_id       INT,
    gross_weight       NUMERIC(10, 2),
    seal_number        VARCHAR(50),
    note               VARCHAR(255),
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manifest_id)       REFERENCES manifest(manifest_id),
    FOREIGN KEY (container_type_id) REFERENCES container_types(container_type_id),
    FOREIGN KEY (status_id)         REFERENCES container_statuses(status_id),
    FOREIGN KEY (cargo_type_id)     REFERENCES cargo_types(cargo_type_id),
    FOREIGN KEY (attribute_id)      REFERENCES cargo_attributes(attribute_id)
);

CREATE TABLE container_status_history (
    history_id   SERIAL PRIMARY KEY,
    container_id VARCHAR(20) NOT NULL,
    status_id    INT         NOT NULL,
    description  VARCHAR(255),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_id) REFERENCES container(container_id),
    FOREIGN KEY (status_id)    REFERENCES container_statuses(status_id)
);

-- =========================
-- 4. YARD 3D STRUCTURE
-- =========================
CREATE TABLE yard_types (
    yard_type_id   SERIAL PRIMARY KEY,
    yard_type_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE yards (
    yard_id      SERIAL PRIMARY KEY,
    yard_type_id INT,
    yard_name    VARCHAR(100) NOT NULL,
    address      VARCHAR(255),
    FOREIGN KEY (yard_type_id) REFERENCES yard_types(yard_type_id)
);

CREATE TABLE yard_zones (
    zone_id        SERIAL PRIMARY KEY,
    yard_id        INT NOT NULL,
    zone_name      VARCHAR(50) NOT NULL,
    capacity_slots INT NOT NULL,
    FOREIGN KEY (yard_id) REFERENCES yards(yard_id)
);

CREATE TABLE block_types (
    block_type_id   SERIAL PRIMARY KEY,
    block_type_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE blocks (
    block_id      SERIAL PRIMARY KEY,
    zone_id       INT NOT NULL,
    block_type_id INT,
    block_name    VARCHAR(50) NOT NULL,
    FOREIGN KEY (zone_id)       REFERENCES yard_zones(zone_id),
    FOREIGN KEY (block_type_id) REFERENCES block_types(block_type_id)
);

CREATE TABLE slots (
    slot_id  SERIAL PRIMARY KEY,
    block_id INT NOT NULL,
    row_no   INT NOT NULL,
    bay_no   INT NOT NULL,
    max_tier INT DEFAULT 5,
    FOREIGN KEY (block_id) REFERENCES blocks(block_id)
);

CREATE TABLE container_positions (
    position_id  SERIAL PRIMARY KEY,
    container_id VARCHAR(20) UNIQUE NOT NULL,
    slot_id      INT         NOT NULL,
    tier         INT         NOT NULL,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_id) REFERENCES container(container_id),
    FOREIGN KEY (slot_id)      REFERENCES slots(slot_id)
);

-- =========================
-- 5. EXPORT PRIORITY
-- =========================
CREATE TABLE export_priority (
    priority_id    SERIAL PRIMARY KEY,
    container_id   VARCHAR(20) UNIQUE NOT NULL,
    priority_level INT DEFAULT 1,
    note           VARCHAR(255),
    FOREIGN KEY (container_id) REFERENCES container(container_id)
);

-- =========================
-- 6. ORDERS / BOOKING
-- =========================
CREATE TABLE order_status (
    status_id   SERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE orders (
    order_id      SERIAL PRIMARY KEY,
    customer_id   INT,
    customer_name VARCHAR(150) NOT NULL,
    phone         VARCHAR(20),
    email         VARCHAR(100),
    address       VARCHAR(255),
    status_id     INT NOT NULL,
    note          VARCHAR(255),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (status_id) REFERENCES order_status(status_id)
);

CREATE TABLE order_container (
    order_id     INT         NOT NULL,
    container_id VARCHAR(20) NOT NULL,
    PRIMARY KEY (order_id, container_id),
    FOREIGN KEY (order_id)     REFERENCES orders(order_id),
    FOREIGN KEY (container_id) REFERENCES container(container_id)
);

CREATE TABLE order_cancellation (
    cancellation_id SERIAL PRIMARY KEY,
    order_id        INT UNIQUE NOT NULL,
    reason          VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- =========================
-- 7. BILL OF LADING
-- =========================
CREATE TABLE bill_of_lading_status (
    status_id   SERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE bill_of_lading (
    bill_id      SERIAL PRIMARY KEY,
    order_id     INT         NOT NULL,
    bill_number  VARCHAR(50) UNIQUE NOT NULL,
    created_date DATE DEFAULT CURRENT_DATE,
    status_id    INT         NOT NULL,
    note         VARCHAR(255),
    FOREIGN KEY (order_id)  REFERENCES orders(order_id),
    FOREIGN KEY (status_id) REFERENCES bill_of_lading_status(status_id)
);

CREATE TABLE bill_of_lading_history (
    history_id  SERIAL PRIMARY KEY,
    bill_id     INT NOT NULL,
    status_id   INT NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id)   REFERENCES bill_of_lading(bill_id),
    FOREIGN KEY (status_id) REFERENCES bill_of_lading_status(status_id)
);

-- =========================
-- 8. GATE OPERATIONS & STORAGE
-- =========================
CREATE TABLE gate_in_receipt (
    gate_in_id   SERIAL PRIMARY KEY,
    container_id VARCHAR(20) NOT NULL,
    voyage_id    INT,
    gate_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by   INT,
    note         VARCHAR(255),
    FOREIGN KEY (container_id) REFERENCES container(container_id),
    FOREIGN KEY (voyage_id)    REFERENCES voyages(voyage_id),
    FOREIGN KEY (created_by)   REFERENCES users(user_id)
);

CREATE TABLE yard_storage (
    storage_id         SERIAL PRIMARY KEY,
    container_id       VARCHAR(20) NOT NULL,
    yard_id            INT         NOT NULL,
    storage_start_date DATE DEFAULT CURRENT_DATE,
    storage_end_date   DATE,
    note               VARCHAR(255),
    FOREIGN KEY (container_id) REFERENCES container(container_id),
    FOREIGN KEY (yard_id)      REFERENCES yards(yard_id)
);

CREATE TABLE gate_out_receipt (
    gate_out_id   SERIAL PRIMARY KEY,
    container_id  VARCHAR(20) NOT NULL,
    gate_out_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by    INT,
    note          VARCHAR(255),
    FOREIGN KEY (container_id) REFERENCES container(container_id),
    FOREIGN KEY (created_by)   REFERENCES users(user_id)
);

-- =========================
-- 9. ALERTS & NOTIFICATIONS
-- =========================
CREATE TABLE alert_level (
    level_id   SERIAL PRIMARY KEY,
    level_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE alert (
    alert_id    SERIAL PRIMARY KEY,
    zone_id     INT,
    level_id    INT,
    description VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status      SMALLINT DEFAULT 0,
    FOREIGN KEY (zone_id)  REFERENCES yard_zones(zone_id),
    FOREIGN KEY (level_id) REFERENCES alert_level(level_id)
);

CREATE TABLE notification (
    notification_id SERIAL PRIMARY KEY,
    title           VARCHAR(150),
    description     TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_notification (
    notification_id INT     NOT NULL,
    user_id         INT     NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id, user_id),
    FOREIGN KEY (notification_id) REFERENCES notification(notification_id),
    FOREIGN KEY (user_id)         REFERENCES users(user_id)
);

-- =========================
-- 10. CHAT
-- =========================
CREATE TABLE chat_room_type (
    type_id   SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE chat_room (
    room_id    SERIAL PRIMARY KEY,
    type_id    INT NOT NULL,
    room_name  VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES chat_room_type(type_id)
);

CREATE TABLE chat_room_member (
    room_id   INT         NOT NULL,
    user_id   INT         NOT NULL,
    role      VARCHAR(30) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES chat_room(room_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE message (
    message_id  SERIAL PRIMARY KEY,
    room_id     INT  NOT NULL,
    sender_id   INT  NOT NULL,
    description TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id)   REFERENCES chat_room(room_id),
    FOREIGN KEY (sender_id) REFERENCES users(user_id)
);

-- =========================
-- 11. REVIEW
-- =========================
CREATE TABLE review (
    review_id   SERIAL PRIMARY KEY,
    user_id     INT,
    description TEXT,
    rating      INT CHECK (rating >= 1 AND rating <= 5),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
