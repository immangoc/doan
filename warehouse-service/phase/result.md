● I've already read all the files in this conversation — I have the full content of data.sql, pom.xml, application.yml, architecture.txt, list-function.txt, and the complete algorithm section from docs.md (via
the document extraction). I have everything needed.

Let me now produce the full analysis as instructed.                                                                                                                                                              
---                                                                                                                                                                                                                HT Port Logistics — warehouse-service System Analysis

  ---
1. System Overview

What is this system?
A Web-based Port Container Yard Management System for Hùng Thủy Maritime Transport Company. It digitizes the full container lifecycle: customer booking → gate-in → 3D yard placement (with Smart Stacking
algorithm) → monitoring → gate-out & billing.

Main Business Domains:

┌──────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────┐
│              Domain              │                                         Description                                          │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Auth & User Management           │ JWT-based RBAC for 3 roles: Customer, Warehouse Staff, Admin                                 │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Booking (Orders)                 │ Customers submit import/export container bookings; operators approve/reject                  │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Container & Cargo                │ Container identity, type, cargo attributes, full status history                              │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Vessel & Voyage                  │ Ships, schedules, manifests linking containers to arrivals                                   │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Yard Management (3D)             │ Physical structure: Yard → Zone → Block → Slot → Tier                                        │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Gate Operations                  │ Gate-in (check-in EIR) and gate-out (release receipt)                                        │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Container Placement Optimization │ 4-module Smart Stacking algorithm (Pre-filter → ML Scoring → BFS Relocation → Exit Distance) │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Billing                          │ Storage fees, lifting fees, invoices, payments                                               │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Alerts & Notifications           │ Overdue containers, yard capacity warnings, zone-level incidents                             │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Dashboard & Reports              │ Real-time KPIs for all 3 roles                                                               │
├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Chat & Support                   │ Customer ↔ Staff chat rooms                                                                  │
└──────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────┘

Core 4-Step Process Flow:
Nhập cảng (Gate-In) → Bốc xếp (Placement) → Lưu kho (Storage) → Xuất (Gate-Out)

  ---
2. Database Analysis

Full table inventory (42 tables, grouped by domain):

Auth / User (8 tables)

┌──────────────────┬────────────────────────────────────────────┬──────────────────────────────┐
│      Table       │                 Key Fields                 │             Role             │
├──────────────────┼────────────────────────────────────────────┼──────────────────────────────┤
│ roles            │ role_id, role_name                         │ CUSTOMER, OPERATOR, ADMIN    │
├──────────────────┼────────────────────────────────────────────┼──────────────────────────────┤
│ permissions      │ permission_id, permission_name             │ Fine-grained access control  │
├──────────────────┼────────────────────────────────────────────┼──────────────────────────────┤
│ role_permissions │ role_id ↔ permission_id                    │ RBAC join                    │
├──────────────────┼────────────────────────────────────────────┼──────────────────────────────┤
│ users            │ user_id, username, password, email, status │ Core identity                │
├──────────────────┼────────────────────────────────────────────┼──────────────────────────────┤
│ user_roles       │ user_id ↔ role_id                          │ Many-to-many                 │
├──────────────────┼────────────────────────────────────────────┼──────────────────────────────┤
│ user_profiles    │ profile_id, user_id (UNIQUE)               │ Extended personal info (1:1) │
├──────────────────┼────────────────────────────────────────────┼──────────────────────────────┤
│ user_addresses   │ address_id, user_id                        │ Multiple addresses per user  │
├──────────────────┼────────────────────────────────────────────┼──────────────────────────────┤
│ system_logs      │ log_id, user_id, action                    │ Full audit trail             │
└──────────────────┴────────────────────────────────────────────┴──────────────────────────────┘

Vessel & Shipping (3 tables)

┌──────────┬───────────────────────────────────────┬──────────────────────────────┐
│  Table   │              Key Fields               │             Role             │
├──────────┼───────────────────────────────────────┼──────────────────────────────┤
│ vessels  │ vessel_id, vessel_name, shipping_line │ Ship registry                │
├──────────┼───────────────────────────────────────┼──────────────────────────────┤
│ voyages  │ voyage_id, vessel_id, ETA, ATA        │ Voyage schedule              │
├──────────┼───────────────────────────────────────┼──────────────────────────────┤
│ manifest │ manifest_id, voyage_id                │ Links containers to a voyage │
└──────────┴───────────────────────────────────────┴──────────────────────────────┘

Container & Cargo (6 tables)

┌──────────────────────────┬─────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────┐
│          Table           │                                 Key Fields                                  │               Role               │
├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ container_types          │ container_type_id, name                                                     │ 20ft / 40ft                      │
├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ container_statuses       │ status_id, status_name                                                      │ PENDING, IN_YARD, EXPORTED, etc. │
├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ cargo_types              │ cargo_type_id, name                                                         │ DRY, COLD, FRAGILE, HAZARD       │
├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ cargo_attributes         │ attribute_id, name                                                          │ Special handling flags           │
├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ container                │ container_id (VARCHAR PK), manifest_id, cargo/type/status FKs, gross_weight │ Central entity                   │
├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ container_status_history │ history_id, container_id, status_id                                         │ Full status audit                │
└──────────────────────────┴─────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────┘

Yard 3D Structure (7 tables)

┌─────────────────────┬───────────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
│        Table        │                    Key Fields                     │                         Role                         │
├─────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ yard_types          │ yard_type_id, name                                │ cold / dry / fragile / hazard — drives cargo routing │
├─────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ yards               │ yard_id, yard_type_id, name                       │ Physical yard                                        │
├─────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ yard_zones          │ zone_id, yard_id, capacity_slots                  │ Zone within yard — basis for occupancy               │
├─────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ block_types         │ block_type_id, name                               │ Block classification                                 │
├─────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ blocks              │ block_id, zone_id, block_type_id                  │ Block within zone                                    │
├─────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ slots               │ slot_id, block_id, row_no, bay_no, max_tier       │ Physical slot (3D cell)                              │
├─────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ container_positions │ position_id, container_id (UNIQUE), slot_id, tier │ Current position of container                        │
└─────────────────────┴───────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘

Export & Priority (1 table)

┌─────────────────┬────────────────────────────────────────────────────┬─────────────────────────────────────┐
│      Table      │                     Key Fields                     │                Role                 │
├─────────────────┼────────────────────────────────────────────────────┼─────────────────────────────────────┤
│ export_priority │ priority_id, container_id (UNIQUE), priority_level │ 1=highest; drives algorithm scoring │
└─────────────────┴────────────────────────────────────────────────────┴─────────────────────────────────────┘

Orders / Booking (4 tables)

┌────────────────────┬────────────────────────────────────────────────────────┬────────────────────────────────────────┐
│       Table        │                       Key Fields                       │                  Role                  │
├────────────────────┼────────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ order_status       │ status_id, status_name                                 │ PENDING, APPROVED, REJECTED, CANCELLED │
├────────────────────┼────────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ orders             │ order_id, customer_id, status_id, denormalized contact │ Booking request                        │
├────────────────────┼────────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ order_container    │ order_id ↔ container_id                                │ One order covers multiple containers   │
├────────────────────┼────────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ order_cancellation │ cancellation_id, order_id (UNIQUE), reason             │ Cancellation record                    │
└────────────────────┴────────────────────────────────────────────────────────┴────────────────────────────────────────┘

Bill of Lading (3 tables)

┌────────────────────────┬─────────────────────────────────────────┬─────────────────────┐
│         Table          │               Key Fields                │        Role         │
├────────────────────────┼─────────────────────────────────────────┼─────────────────────┤
│ bill_of_lading_status  │ status_id, name                         │ Shipping doc status │
├────────────────────────┼─────────────────────────────────────────┼─────────────────────┤
│ bill_of_lading         │ bill_id, order_id, bill_number (UNIQUE) │ Shipping document   │
├────────────────────────┼─────────────────────────────────────────┼─────────────────────┤
│ bill_of_lading_history │ history_id, bill_id, status_id          │ Status audit trail  │
└────────────────────────┴─────────────────────────────────────────┴─────────────────────┘

Gate Operations & Storage (3 tables)

┌──────────────────┬─────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────┐
│      Table       │                       Key Fields                        │                        Role                         │
├──────────────────┼─────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ gate_in_receipt  │ gate_in_id, container_id, voyage_id, created_by         │ Physical entry record                               │
├──────────────────┼─────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ yard_storage     │ storage_id, container_id, yard_id, start_date, end_date │ Storage period — drives billing & algorithm urgency │
├──────────────────┼─────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ gate_out_receipt │ gate_out_id, container_id, created_by                   │ Physical exit record                                │
└──────────────────┴─────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────┘

Alerts & Notifications (4 tables)

┌───────────────────┬─────────────────────────────────────┬─────────────────────────────────────────────────┐
│       Table       │             Key Fields              │                      Role                       │
├───────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────┤
│ alert_level       │ level_id, name                      │ INFO / WARNING / CRITICAL                       │
├───────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────┤
│ alert             │ alert_id, zone_id, level_id, status │ Zone-level alert (COLD_FULL, URGENT_EXIT, etc.) │
├───────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────┤
│ notification      │ notification_id, title, description │ Broadcast message                               │
├───────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────┤
│ user_notification │ notification_id ↔ user_id, is_read  │ Per-user delivery                               │
└───────────────────┴─────────────────────────────────────┴─────────────────────────────────────────────────┘

Chat (3 tables)

┌──────────────────┬─────────────────────────────────────────────┬─────────────────┐
│      Table       │                 Key Fields                  │      Role       │
├──────────────────┼─────────────────────────────────────────────┼─────────────────┤
│ chat_room_type   │ type_id, name                               │ Support / Group │
├──────────────────┼─────────────────────────────────────────────┼─────────────────┤
│ chat_room        │ room_id, type_id                            │ Chat room       │
├──────────────────┼─────────────────────────────────────────────┼─────────────────┤
│ chat_room_member │ room_id ↔ user_id                           │ Room membership │
├──────────────────┼─────────────────────────────────────────────┼─────────────────┤
│ message          │ message_id, room_id, sender_id, description │ Chat message    │
└──────────────────┴─────────────────────────────────────────────┴─────────────────┘

Review (1 table)

┌────────┬───────────────────────────────────────────────┬───────────────────┐
│ Table  │                  Key Fields                   │       Role        │
├────────┼───────────────────────────────────────────────┼───────────────────┤
│ review │ review_id, user_id, rating (1–5), description │ Customer feedback │
└────────┴───────────────────────────────────────────────┴───────────────────┘

Critical Constraints:
- container_positions.container_id → UNIQUE: a container is in exactly one slot at a time
- export_priority.container_id → UNIQUE: one priority record per container
- yard_storage.storage_end_date → drives algorithm's exit_urgency = 1/max(days_to_exit, 1)
- Hard constraint: cargo_type must match yard_type (cold→cold, dry→dry) — no exceptions
- Hard constraint: days_to_exit <= T_HARD (3 days) → slot is INFEASIBLE regardless of ML score
- container.container_id is VARCHAR(20) PK (real-world ISO codes e.g. TCKU1234567)

  ---
3. Architecture Analysis

Type: Modular Monolith — single Spring Boot 3.3.2 application, Java 21.

Stack:

┌─────────────┬──────────────────────────────────────────────────────┐
│    Layer    │                      Technology                      │
├─────────────┼──────────────────────────────────────────────────────┤
│ Web / API   │ Spring Boot Web (REST), SpringDoc OpenAPI            │
├─────────────┼──────────────────────────────────────────────────────┤
│ Security    │ Spring Security + JWT (jjwt 0.11.5)                  │
├─────────────┼──────────────────────────────────────────────────────┤
│ Persistence │ Spring Data JPA + Hibernate + PostgreSQL             │
├─────────────┼──────────────────────────────────────────────────────┤
│ Migrations  │ Flyway (classpath:db/migration)                      │
├─────────────┼──────────────────────────────────────────────────────┤
│ Cache       │ Redis (session tokens, hot data)                     │
├─────────────┼──────────────────────────────────────────────────────┤
│ Events      │ Kafka (optional, APP_KAFKA_ENABLED=false by default) │
├─────────────┼──────────────────────────────────────────────────────┤
│ Email       │ Spring Mail (Gmail SMTP for OTP/notifications)       │
├─────────────┼──────────────────────────────────────────────────────┤
│ Mapping     │ MapStruct + Lombok                                   │
├─────────────┼──────────────────────────────────────────────────────┤
│ Monitoring  │ Spring Actuator                                      │
└─────────────┴──────────────────────────────────────────────────────┘

Module structure (from architecture.txt) — Module-first + Layered:

common/          → BaseEntity, configs, constants, security (JWT), exceptions, utils
infrastructure/  → MailService, RedisCacheService, KafkaProducerService
modules/
auth/          → login, register, password reset
user/          → users, roles, permissions, profiles, addresses
booking/       → orders, lifecycle, bill of lading
container/     → container CRUD, types, statuses, cargo
vessel/        → vessels, voyages, manifests
yard/          → yard structure, slot allocation, relocation
gate/          → gate-in, gate-out
alert/         → alerts, notifications
billing/       → fee config, invoices, payments
dashboard/     → aggregated KPIs
lookup/        → public lookups (fee table, tracking)

Each module: Controller → Facade → Service → Repository → Entity + DTO/Mapper.

Where the optimization algorithm lives:
Inside modules/yard/service/SlotAllocationService — the 4-module pipeline (Pre-filter → ML Scoring → BFS Relocation → Exit Distance → Final Score) runs entirely in-memory and returns top-5 slot candidates in <
100ms.

  ---
4. Feature Breakdown

Core Features (must-have for system to function)

- Auth: register, login, forgot/reset password, JWT refresh
- User CRUD + RBAC
- Booking lifecycle (create → approve/reject → cancel)
- Container check-in, gate-in receipt, yard storage tracking
- Container placement algorithm (Smart Stacking)
- Gate-out + fee calculation
- Yard visual map (grid: bay/row/tier per block)
- Alerts: COLD_FULL, URGENT_EXIT, OVERDUE, WARNING/CRITICAL occupancy

Secondary Features (important but not blocking)

- Bill of lading generation and tracking
- Relocation suggestions & orders
- Dashboard KPIs per role
- Notification center (push per user)
- Chat/support rooms
- Customer reviews
- Report exports
- Vessel/voyage schedule management
- Public fee schedule lookup

  ---
5. Development Phases

  ---
Phase 1 — Core Foundation & Infrastructure

Goal: Project skeleton, all shared infrastructure wired and tested. Zero business logic.

Scope:
- Spring Boot project structure per architecture.txt
- common/base/: BaseEntity (id, createdAt, updatedAt with @EntityListeners)
- common/config/: SecurityConfig (permit-all placeholder), OpenApiConfig, RedisConfig, KafkaConfig, AuditingConfig
- common/exception/: BusinessException, ResourceNotFoundException, UnauthorizedException, ForbiddenException, GlobalExceptionHandler
- common/dto/: ApiResponse<T>, PageResponse<T>, ErrorResponse, PageRequestDto
- common/constant/: RoleCode, BookingStatus, ContainerStatus, ErrorCode, AppConstant
- common/security/jwt/: JwtTokenProvider, JwtAuthenticationFilter, JwtAuthenticationEntryPoint
- common/security/: CustomUserDetails, CustomUserDetailsService
- infrastructure/mail/: MailService interface + impl (Spring Mail)
- infrastructure/redis/: RedisCacheService (token blacklist, OTP storage)
- infrastructure/kafka/: KafkaProducerService (guarded by APP_KAFKA_ENABLED flag)
- Flyway migration V1__init_schema.sql — full schema from data.sql (all 42 tables)
- Flyway migration V2__seed_data.sql — seed roles, permissions, container statuses, order statuses, alert levels, yard types

Tables used: All (schema creation only)
APIs: None
Complexity: Medium — high boilerplate, security wiring, no business logic

  ---
Phase 2 — User, Auth & RBAC

Goal: All three roles can register, login, and be managed. Every subsequent phase depends on this.

Scope:
- modules/auth/: POST /auth/register, POST /auth/login (returns JWT), POST /auth/logout (blacklist token in Redis), POST /auth/forgot-password (email OTP via MailService), POST /auth/reset-password (verify OTP
  from Redis, update password)
- modules/user/: GET/PUT /users/me (own profile + address), Admin CRUD for users (GET/POST/PUT/DELETE /admin/users), Admin approve/suspend customer accounts, Admin CRUD roles & permissions
- Password reset token stored in Redis (TTL 15 min) — uses existing users table only, no new table
- system_logs written on every auth event and admin action
- @PreAuthorize annotations with roles wired

Tables: roles, permissions, role_permissions, users, user_roles, user_profiles, user_addresses, system_logs

Key APIs:
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /users/me
PUT    /users/me
GET    /users/me/addresses
POST   /users/me/addresses
GET    /admin/users
POST   /admin/users
PUT    /admin/users/{id}
DELETE /admin/users/{id}
PUT    /admin/users/{id}/status
GET    /admin/roles
POST   /admin/roles
GET    /admin/permissions
Complexity: Medium-High — JWT filter chain, OTP email flow, role hierarchy

  ---
Phase 3 — Catalog & Master Data

Goal: All lookup/reference data that other phases depend on. Pure CRUD, no algorithms.

Scope:
- modules/container/: CRUD for container_types, cargo_types, cargo_attributes (Admin only)
- modules/vessel/: CRUD for vessels, voyages, manifest (Admin/Operator)
- modules/yard/ (structure only): CRUD for yards, yard_zones, blocks, slots (Admin)
- modules/lookup/: public read endpoints — fee schedule preview, vessel schedules, container type list
- Seed additional data in V3__seed_catalog.sql: yard_types (cold/dry/fragile/hazard), block_types, container_statuses, cargo_types

Tables: container_types, cargo_types, cargo_attributes, container_statuses, vessels, voyages, manifest, yard_types, yards, yard_zones, block_types, blocks, slots

Key APIs:
GET/POST/PUT/DELETE  /admin/container-types
GET/POST/PUT/DELETE  /admin/cargo-types
GET/POST/PUT/DELETE  /admin/cargo-attributes
GET/POST/PUT/DELETE  /admin/vessels
GET/POST/PUT/DELETE  /admin/voyages
GET/POST/PUT/DELETE  /admin/manifests
GET/POST/PUT/DELETE  /admin/yards
GET/POST/PUT/DELETE  /admin/yards/{id}/zones
GET/POST/PUT/DELETE  /admin/zones/{id}/blocks
GET/POST/PUT/DELETE  /admin/blocks/{id}/slots
GET                  /public/vessel-schedules
GET                  /public/container-types
Complexity: Low — standard CRUD, no business logic

  ---
Phase 4 — Booking (Orders) & Bill of Lading

Goal: Customers can book container slots; operators approve/reject; bill of lading is generated.

Scope:
- modules/booking/: full booking lifecycle
    - Customer: create booking (cargo info, import/export dates, containers), list/filter/search own bookings, view detail, cancel (direct if PENDING; cancel-request if APPROVED), modify request
    - Operator: list pending bookings, approve/reject, approve/reject modification requests
    - On approval → auto-generate bill_of_lading + bill_of_lading_history entry
    - On cancellation → create order_cancellation record
- Order status machine: PENDING → APPROVED | REJECTED, APPROVED → CANCEL_REQUESTED → CANCELLED
- notification + user_notification inserted on every status change → customer receives alert

Tables: order_status, orders, order_container, order_cancellation, bill_of_lading_status, bill_of_lading, bill_of_lading_history, notification, user_notification

Key APIs:
POST   /bookings                            (Customer)
GET    /bookings                            (Customer — own list)
GET    /bookings/{id}                       (Customer)
DELETE /bookings/{id}                       (Customer — cancel PENDING)
POST   /bookings/{id}/cancel-request        (Customer — cancel APPROVED)
POST   /bookings/{id}/modify-request        (Customer)
GET    /operator/bookings                   (Operator — pending list)
PUT    /operator/bookings/{id}/approve
PUT    /operator/bookings/{id}/reject
PUT    /operator/bookings/{id}/approve-modify
PUT    /operator/bookings/{id}/reject-modify
GET    /bookings/{id}/bill-of-lading
GET    /notifications
PUT    /notifications/{id}/read
Complexity: High — multi-role state machine, notification side-effects, BOL generation

  ---
Phase 5 — Container Registration & Gate-In

Goal: A physical container can be checked in, registered in the system, and stored in the yard (manual slot assignment, algorithm comes in Phase 6).

Scope:
- modules/container/: create container entity (link to manifest, assign cargo_type, container_type, weight), view/search containers by ID/status/type, full status history, export_priority CRUD
- modules/gate/GateIn: staff executes gate-in
    - Validates container exists and matches approved booking
    - Creates gate_in_receipt (records voyage, staff, timestamp)
    - Creates yard_storage record (start_date = today, end_date from booking)
    - Updates container_statuses → IN_YARD
    - Writes container_status_history
    - Manual slot assignment: staff picks slot + tier → writes container_positions
    - Print EIR (returns gate_in_receipt data for frontend to render)

Tables: container, container_status_history, gate_in_receipt, yard_storage, container_positions, export_priority

Key APIs:
POST   /containers                          (Operator — create/register)
GET    /containers                          (search: status, cargo_type, yard)
GET    /containers/{id}
GET    /containers/{id}/status-history
POST   /gate/in                             (Operator — execute gate-in)
GET    /gate/in/{id}                        (receipt detail)
GET    /gate/in/history                     (list)
POST   /containers/{id}/position            (manual slot assign)
GET    /containers/{id}/position
POST   /export-priority                     (set priority on container)
PUT    /export-priority/{containerId}
Complexity: Medium-High — first cross-table business transaction (4+ tables in one flow)

  ---
Phase 6 — Container Placement Optimization Algorithm

Goal: The core smart stacking engine. Auto-suggest optimal slot on gate-in; detect and resolve relocation needs.

Scope: Implement the full 4-module pipeline inside modules/yard/service/SlotAllocationService:

Pipeline (runs in < 100ms):

1. Occupancy Check — query container_positions JOIN slots WHERE zone_id / capacity_slots. If ≥ 100% → reject gate-in. If ≥ 90% → flag CRITICAL, force manual confirmation, raise mu_eff to 0.20.
2. Module 0 — Pre-filter (Cargo Type Hard Constraint) — join slots → blocks → yard_zones → yards → yard_types. Only keep slots where yard_type matches cargo_type_to_yard_type(incoming.cargo_type_id). No
   exceptions. For cold containers in full cold zone → INSERT alert(COLD_FULL, CRITICAL).
3. Deadline Filter (Hard Constraint) — for remaining candidates, check container_positions at that slot: if any container below has yard_storage.storage_end_date - TODAY() <= T_HARD (3 days) → mark slot
   INFEASIBLE.
4. Module A — ML Scoring — compute 25 features from DB (geography, density, LIFO score, weight safety, company cluster, shipping line cluster) → apply LightGBM model (load model.txt) → get ml_score ∈ [0,1] per
   candidate.
5. Module B — Relocation BFS (CRP, depth ≤ 4) — for each candidate slot, plan minimum relocations using Greedy BFS with immutable YardState (in-memory simulation, never partial-commit). Apply priority_guard:
   never relocate a container with lower priority_level number (higher priority) to make room for lower priority incoming. If depth > 4 → is_feasible = false.
6. Module C — Exit Distance — exit_cost = row_no + bay_no/4 + (tier-1) + n_above × 1.5. Normalize to exit_norm.
7. Future Block Score — for containers above the candidate slot: future_block = Σ (1/priority_level_i × 1/days_to_exit_i). Normalize to future_block_norm.
8. Final Score — final_score = ml_score - 0.15×moves_norm - mu_eff×exit_norm - 0.12×future_block_norm. Return top-5 candidates with full breakdown.
9. Commit (with recheck) — SELECT FOR UPDATE on yard_zones → verify occupancy hasn't changed → UPDATE container_positions → DB triggers fire container_position_history (if trigger exists) → auto-INSERT alerts
   for UPCOMING_EXIT/URGENT_EXIT/OVERDUE if detected.

RelocationService — GET /yard/relocations/suggestions detects containers blocking high-priority exports. Staff creates relocation order, executes, confirms.

Tables: container_positions, slots, blocks, yard_zones, yards, yard_types, export_priority, yard_storage, container (weight), alert, alert_level

Key APIs:
POST   /yard/allocate                       (dry-run: returns top-5 suggestions)
POST   /yard/allocate/confirm               (commit chosen slot)
GET    /yard/map/{yardId}                   (full 3D grid state for visualization)
GET    /yard/map/zone/{zoneId}              (zone occupancy data)
GET    /yard/relocations/suggestions        (containers needing relocation)
POST   /yard/relocations                    (create relocation order)
PUT    /yard/relocations/{id}/confirm       (staff confirms done)
PUT    /yard/slots/{id}/lock                (lock slot)
PUT    /yard/slots/{id}/unlock
Complexity: Very High — NP-hard core, weight constraints, in-memory simulation, race condition handling, ML model integration

  ---
Phase 7 — Gate-Out & Billing

Goal: Containers exit the yard; fees are calculated; invoices are generated and payments recorded.

Scope:
- modules/billing/: Admin CRUD for fee_config (daily storage rate, lifting fee per container type), fee estimation endpoint (public), invoice generation, payment recording
- modules/gate/GateOut: staff executes gate-out
    - Verify container IN_YARD, linked to approved booking
    - Verify payment status (pre-paid orders pass immediately; unpaid → calculate fee first)
    - Calculate storage fee: (storage_end_date - storage_start_date) × daily_rate + lifting fee
    - Generate invoice with line items
    - Record payment if paid
    - Create gate_out_receipt
    - Set yard_storage.storage_end_date = TODAY()
    - Update container_statuses → EXPORTED
    - Clear container_positions record
    - Write container_status_history

Tables: gate_out_receipt, yard_storage (update), container_positions (delete), container_status_history
(billing tables fee_config, invoice, payment — from modules/billing/entity/ in architecture.txt — use existing DB or add to migration if not yet in schema)

Key APIs:
GET    /gate/out/check/{containerId}        (verify exit eligibility)
POST   /gate/out                            (execute gate-out)
GET    /gate/out/history
GET    /billing/fee-estimate                (public: estimate by type + days)
GET    /admin/billing/fee-config
POST   /admin/billing/fee-config
PUT    /admin/billing/fee-config/{id}
GET    /billing/invoices/{id}
POST   /billing/payments
GET    /billing/invoices                    (customer: own invoices)
Complexity: High — multi-table atomic transaction, fee calculation logic, payment state management

  ---
Phase 8 — Alerts, Monitoring & Scheduled Jobs

Goal: Proactive system detects problems and notifies users automatically.

Scope:
- modules/alert/: create/resolve/list alerts, alert levels management
- Scheduled jobs (@Scheduled):
    - Daily — Overdue check: query yard_storage WHERE storage_end_date <= TODAY() → INSERT alert(OVERDUE, CRITICAL) + notification → fan out to customer via user_notification + flag container status = OVERDUE
    - Daily — Upcoming exit (T_WARN = 7 days): query days_to_exit <= 7 → INSERT alert(UPCOMING_EXIT, WARNING) + notify customer
    - Daily — Urgent exit (T_URGENT = 3 days): days_to_exit <= 3 → INSERT alert(URGENT_EXIT, CRITICAL) → notify manager
    - Hourly — Occupancy check: compute zone_occupancy per zone; ≥ 80% → WARNING alert; ≥ 90% → CRITICAL alert + notify all managers
- Incident reporting: staff reports container damage → INSERT alert + container_status_history
- user_notification fan-out: on every alert created, determine recipients by role and insert user_notification rows

Tables: alert_level, alert, notification, user_notification, yard_storage, container_positions, yard_zones

Key APIs:
GET    /alerts                              (Operator/Admin — active alerts)
GET    /alerts/{id}
PUT    /alerts/{id}/resolve
POST   /alerts/incident                     (Staff — report damage/incident)
GET    /notifications
PUT    /notifications/{id}/read
PUT    /notifications/read-all
Complexity: Medium — event-driven, scheduler wiring, notification fan-out logic

  ---
Phase 9 — Dashboard & Reports

Goal: All three roles have meaningful real-time dashboards and exportable reports.

Scope:
- modules/dashboard/:
    - Customer dashboard: total containers in yard, pending bookings count, containers with days_to_exit <= 7, recent notifications
    - Operator dashboard: today's gate-in/out count, pending approvals count, relocation task list, active alerts, per-zone occupancy bar
    - Admin dashboard: yard occupancy % (overall + per zone), daily throughput chart data, revenue summary, container type breakdown, booking status breakdown
- modules/dashboard/ or modules/lookup/: report export (CSV) for bookings, revenue, inventory
- All queries are read-only aggregations — no new tables needed

Tables: Aggregation queries across container_positions, yard_zones, orders, gate_in_receipt, gate_out_receipt, yard_storage, alert, user_notification, invoice, payment

Key APIs:
GET    /dashboard/customer
GET    /dashboard/operator
GET    /dashboard/admin
GET    /reports/bookings?from=&to=&format=csv
GET    /reports/revenue?from=&to=&format=csv
GET    /reports/inventory?format=csv
GET    /yard/map/{yardId}                   (full 3D visualization data)
Complexity: Medium — complex SQL aggregations, no new business logic

  ---
Phase 10 — Chat, Reviews & Secondary Features

Goal: Support features that complete the product but don't affect core operations.

Scope:
- modules/ (chat): create support chat room (customer ↔ staff), send/receive messages, chat history with pagination
- Customer reviews: submit rating (1–5) + description, view reviews (Admin)
- Public vessel/voyage schedule lookup (unauthenticated)
- Customer activity log (system_logs read endpoint for own actions)
- Data backup trigger (Admin — initiate DB export, returns download link)
- Kafka event publishing for gate-in/gate-out events (when APP_KAFKA_ENABLED=true) — yard-events topic

Tables: chat_room_type, chat_room, chat_room_member, message, review, system_logs

Key APIs:
POST   /chat/rooms
GET    /chat/rooms
POST   /chat/rooms/{id}/messages
GET    /chat/rooms/{id}/messages
POST   /reviews
GET    /admin/reviews
GET    /public/vessel-schedules
GET    /users/me/activity-log
POST   /admin/backup
Complexity: Low-Medium — independent of core, safe to develop last

  ---
Phase Summary

┌───────┬────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┬─────────────┐
│ Phase │                         Focus                          │                            Key Tables                            │ Complexity  │
├───────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼─────────────┤
│ 1     │ Core Foundation (project skeleton, infra, schema)      │ All (DDL only)                                                   │ Medium      │
├───────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼─────────────┤
│ 2     │ Auth, User, RBAC                                       │ users, roles, permissions, user_profiles, system_logs            │ Medium-High │
├───────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼─────────────┤
│ 3     │ Catalog & Master Data (vessels, yard structure, types) │ vessels, voyages, yards, blocks, slots, cargo_types              │ Low         │
├───────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼─────────────┤
│ 4     │ Booking & Bill of Lading                               │ orders, order_container, bill_of_lading, notification            │ High        │
├───────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼─────────────┤
│ 5     │ Container Registration & Gate-In                       │ container, gate_in_receipt, yard_storage, container_positions    │ Medium-High │
├───────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼─────────────┤
│ 6     │ Smart Stacking Optimization Algorithm                  │ container_positions, slots, export_priority, yard_storage, alert │ Very High   │
├───────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼─────────────┤
│ 7     │ Gate-Out & Billing                                     │ gate_out_receipt, yard_storage, invoice, payment                 │ High        │
├───────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼─────────────┤
│ 8     │ Alerts, Monitoring & Scheduled Jobs                    │ alert, notification, user_notification                           │ Medium      │
├───────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼─────────────┤
│ 9     │ Dashboard & Reports                                    │ Read-only aggregations                                           │ Medium      │
├───────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼─────────────┤
│ 10    │ Chat, Reviews, Secondary Features                      │ chat_room, message, review                                       │ Low-Medium  │
└───────┴────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────┴─────────────┘

▎ Hard dependencies: Phase 1 → 2 → 3 must be sequential. Phase 4 and 5 can run in parallel after Phase 3. Phase 6 requires Phase 5. Phase 7 requires Phase 6. Phase 8 requires Phase 5+6. Phase 9 and 10 can
start after Phase 5.