
● ---
API Integration Phase Plan (do-an-full → then 3D)

  ---
1. Planning Principles

- do-an-full is the priority — every screen must reach full CRUD, not just read
- Replace Supabase/mock data domain by domain, not all at once
- Identify and flag missing backend APIs per phase — do not block frontend on them, mark for parallel backend work
- 3D integration is the final phase, dependent on yard/container data being fully stable
- No frontend architecture changes — integration is data-layer only

  ---
2. Overall Strategy

- Start with auth and read-only catalog (lowest risk, highest dependency)
- Move to user/account management, then core business operations (orders, containers)
- Then operational complexity (yard, slots, gate)
- Then financial layer (invoice, fees)
- Then aggregated views (dashboard, reports, alerts)
- Finally: 3D visualization wired to live data

  ---
3. Detailed Phases

  ---
Phase 1 — Auth & Catalog Foundation

Goal
Establish real authentication and populate all master data dropdowns/lists from backend. This unlocks every other
phase.

Frontend scope (do-an-full)
- Login screen
- Register screen
- Logout
- Admin: Container Types screen (QuanLyLoaiContainer, AdminContainerTypesSection)
- Admin: Cargo Types screen (QuanLyLoaiHang, AdminCargoTypesSection)
- Admin: Shipping Companies screen (AdminShippingCompaniesSection, QuanLyHangTau)
- Admin: Schedule/Vessel screen (QuanLyLich, AdminSchedulesSection)
- Admin: Fee configuration screen (QuanLyCuocPhi, AdminFeesSection)

Backend scope
- Auth module (login, register, forgot/reset password)
- Lookup/catalog: container types, cargo types, cargo attributes
- Vessel / Voyage / Shipping line module
- Fee config module

CRUD Coverage
- Auth: CREATE (register), READ (profile), no update/delete here
- Container Types: full CRUD
- Cargo Types: full CRUD
- Cargo Attributes: full CRUD
- Vessel / Shipping Company: full CRUD
- Voyage / Schedule: full CRUD
- Fee Config: READ + UPDATE (rates are edited, not deleted)

Missing API
- Fee config may lack a GET all / UPDATE endpoint — needs verification
- Cargo attribute CRUD endpoint — may not exist (only used as lookup in schema)
- Vessel/schedule list with pagination — may be missing

Integration description
- Login/register forms connect to backend auth, JWT stored client-side
- All catalog admin screens replace static lists with real backend data
- Add/edit/delete actions on container types, cargo types, vessel records connect to backend
- Fee rate editor connects to backend fee config endpoint

Dependencies
- Backend auth module stable and returning JWT with role
- Catalog/lookup endpoints exist

Risk / Complexity
- LOW — mostly read and simple CRUD; no business logic complexity

  ---
Phase 2 — User & Account Management CRUD

Goal
Fully connect user management screens — admin can manage accounts, assign roles, approve customers, and view activity
logs.

Frontend scope (do-an-full)
- UserManagement screen
- QuanLyTaiKhoan (Account management)
- AdminAccountMergedSection
- AdminAuthSection
- AdminPermissionsSection
- AdminActivitiesSection
- Customer: profile/account settings screen

Backend scope
- User module: CRUD users, list, detail, status toggle
- Role module: list roles, assign to user
- Permission module: list permissions, assign to role
- System log module: user activity log list

CRUD Coverage
- Users: full CRUD (create, list, detail, update, deactivate/delete)
- Roles: READ + assign to user
- Permissions: READ + assign to role
- Activity logs: READ only (system-generated)
- Customer account approval: UPDATE (approve/reject status)

Missing API
- User status toggle endpoint (activate / deactivate account) — may be missing
- Admin force-reset password endpoint — likely missing
- User activity log list endpoint (from system_logs table) — controller may not exist
- Customer account approval endpoint — may be missing (separate from user CRUD)
- Bulk user export — likely missing

Integration description
- User list screen replaces mock data with paginated API results with search/filter
- Create/edit user forms connect to backend with role assignment
- Admin can approve or suspend customer accounts via real API action
- Permissions screen shows live role-permission matrix from backend
- Activity log screen displays real entries from system_logs

Dependencies
- Phase 1 complete (auth + roles must exist before user management works)

Risk / Complexity
- MEDIUM — role/permission assignment has ordering dependency; account approval workflow must match backend status
  machine

  ---
Phase 3 — Order / Booking Full CRUD

Goal
Connect the entire booking lifecycle — from customer creation to operator approval/rejection — with full CRUD on all
sides.

Frontend scope (do-an-full)
- Customer: Create booking form
- Customer: Booking list / history (Orders screen)
- Customer: Booking detail / status tracking
- Customer: Cancel booking
- Customer: Request booking edit
- Operator/Admin: DonHang (order list)
- Operator/Admin: Booking approval / rejection screen
- Admin: Order management with full filter/search

Backend scope
- Booking module: create, list, detail, approve, reject, cancel, request edit
- Order module: list, detail, filter, search
- Order cancellation module
- Bill of lading module: status tracking

CRUD Coverage
- Booking: CREATE (customer), READ (list + detail), UPDATE (approve/reject/edit request), DELETE/CANCEL
- Order: READ (list + detail + filter)
- Bill of lading: READ + status UPDATE
- Cancellation: CREATE (request), UPDATE (approve/reject by operator)

Missing API
- Booking edit/amendment request API — likely missing (only create and cancel exist in schema)
- Operator approval for booking edit request — likely missing
- Order filter/search with multiple criteria (type, date range, status) — may be partial
- Bill of lading status update endpoint — may be missing
- Booking list with pagination + role-scoped filtering (customer sees own, admin sees all) — needs verification

Integration description
- Customer booking form submits to backend; response returns booking ID and status
- Booking list for customer shows only their bookings, filtered by real status from backend
- Operator approval screen fetches pending bookings and dispatches approve/reject to backend
- Cancel and edit-request actions connect to respective backend endpoints
- Order management screen supports real search, filter, and pagination from backend

Dependencies
- Phase 1 complete (catalog dropdowns: container type, cargo type needed in booking form)
- Phase 2 complete (user identity needed to scope bookings by customer)

Risk / Complexity
- MEDIUM — booking approval state machine must be strictly followed; role-scoped data visibility must match RBAC

  ---
Phase 4 — Container & Gate Operations CRUD

Goal
Connect container registration and the full gate-in / gate-out operational flow to the backend.

Frontend scope (do-an-full)
- ContainerManagement screen
- Container detail / status history view
- Operator: Gate-in / check-in screen
- Operator: Gate-out screen (release + payment confirmation)
- Operator: Print receipt (EIR)
- Container status manual override (if supported)

Backend scope
- Container module: registration, list, detail, update, status history
- Gate-in module: create receipt, list history
- Gate-out module: create receipt, list history
- Export priority module
- Yard storage module (storage record per container)

CRUD Coverage
- Container: full CRUD (register, list, detail, update metadata, status history READ)
- Gate-in receipt: CREATE + READ (list + detail)
- Gate-out receipt: CREATE + READ (list + detail)
- Export priority: CREATE + UPDATE (priority level)
- Yard storage: READ (start/end dates per container)

Missing API
- Container update endpoint (edit metadata after registration) — may be missing
- Gate-in correction / void endpoint — likely missing
- Gate-out correction endpoint — likely missing
- Container search by ID / filter by status/type — may be partial
- EIR (Equipment Interchange Receipt) print/export endpoint — likely missing
- Container status manual override endpoint — may be missing

Integration description
- Container list screen replaces mock data with real backend records, with status filtering and search
- Gate-in form submits container arrival, voyage, and vehicle data to backend
- Gate-out form checks container eligibility (payment, booking status) via backend and confirms release
- Container detail view shows real status history timeline from backend
- Receipt print action calls backend to generate EIR data

Dependencies
- Phase 3 complete (containers must be linked to approved bookings)
- Phase 1 complete (container types, cargo types populated)

Risk / Complexity
- MEDIUM-HIGH — gate-out requires sequential validation chain (payment check → booking status → storage calculation)
  before backend accepts the operation

  ---
Phase 5 — Yard / Slot / Position Management

Goal
Connect yard structure, slot occupancy, container positioning, and relocation operations to the frontend. This is the
most operationally complex phase.

Frontend scope (do-an-full)
- Operator/Admin: Yard overview / slot map (grid view)
- Slot allocation screen (system-suggested + manual override)
- Relocation order screen (suggest + confirm)
- Lock/unlock slot action
- Yard storage status by zone/block

Backend scope
- Yard module: yard, zone, block, slot hierarchy
- Slot allocation module: auto-suggest position, manual assign
- Container position module: current position per container, update
- Relocation module: suggest relocations, create and confirm relocation orders

CRUD Coverage
- Yard/Zone/Block/Slot: READ (structure) + UPDATE (lock/unlock slot status)
- Container position: READ (current position) + UPDATE (assign/move)
- Slot allocation: CREATE (allocation record)
- Relocation order: CREATE + READ + UPDATE (confirm execution)

Missing API
- Manual position override endpoint — may be missing or only partial
- Slot lock/unlock endpoint — may be missing
- Relocation suggestion algorithm endpoint — likely missing or not exposed
- Relocation order confirmation endpoint — may be missing
- Yard occupancy summary by zone (%, empty count) — may be missing
- Container list by slot/block — may be missing

Integration description
- Yard map renders real slot occupancy from backend (filled/empty/locked per slot)
- Slot allocation screen calls backend algorithm for position suggestion, operator can override and confirm
- Relocation screen fetches system-generated relocation suggestions and operator confirms each
- Slot lock/unlock action sends status update to backend

Dependencies
- Phase 4 complete (containers must be gate-in'd before they can be assigned positions)

Risk / Complexity
- HIGH — most complex phase; slot state and container position must be kept perfectly in sync; relocation logic
  depends on algorithm being implemented in backend

  ---
Phase 6 — Invoice / Fee / Billing

Goal
Connect the billing and payment flow — invoice viewing, fee configuration, and payment confirmation.

Frontend scope (do-an-full)
- Customer: Invoice detail screen
- Customer: Payment history (Payments screen)
- Operator: Confirm payment at gate-out
- Admin: Invoice list
- Admin: QuanLyCuocPhi (fee configuration CRUD)
- Admin: Revenue overview in reports

Backend scope
- Billing module: storage_invoice — auto-generate at gate-out, list, detail
- Fee config module: daily rate, overdue penalty rates
- Payment confirmation

CRUD Coverage
- Invoice: READ (list + detail) — auto-generated by backend at gate-out, no manual CREATE
- Fee config: READ + UPDATE (rate editing)
- Payment confirmation: CREATE (payment record) + READ (payment history)
- Overdue invoice: READ + flag

Missing API
- Invoice list endpoint with filter (by container, customer, date range) — may be missing
- Invoice export / print (PDF) endpoint — likely missing
- Payment record CREATE endpoint — may be missing (payment may only be a flag on gate-out)
- Invoice summary / revenue aggregation endpoint — likely missing
- Manual invoice correction endpoint — likely missing

Integration description
- Customer invoice screen fetches real invoice data generated at gate-out
- Operator gate-out flow reads calculated invoice before confirming release
- Admin invoice list shows all invoices with filter and search
- Fee config screen allows admin to update daily storage rates and overdue penalty rates

Dependencies
- Phase 4 complete (invoices are generated from gate-out receipts)
- Phase 1 complete (fee config rates must be set before invoice calculation is accurate)

Risk / Complexity
- MEDIUM — invoice calculation is backend-owned; frontend is primarily read + confirm

  ---
Phase 7 — Dashboard, Reports & Alerts

Goal
Replace all static dashboard charts and stats with real aggregated data; connect alert center and notifications.

Frontend scope (do-an-full)
- AdminDashboard
- OperatorDashboard
- CustomerDashboard
- PlannerDashboard
- BaoCaoThongKe (Reports & Statistics)
- AdminReportsSection
- AdminAlertsCenterSection
- AdminImportExportSection
- AdminBackupSection
- Notification bell (all roles)

Backend scope
- Dashboard module: occupancy rate, daily in/out counts, pending bookings count, container type distribution
- Report module: revenue report, booking report, container report, customer report, inventory report
- Alert module: active alerts list, alert acknowledge
- Notification module: list by user, mark as read

CRUD Coverage
- Dashboard metrics: READ only (aggregated)
- Reports: READ (+ export action)
- Alerts: READ + UPDATE (acknowledge/resolve)
- Notifications: READ + UPDATE (mark as read, mark all as read)
- System backup: CREATE (trigger backup) — if supported

Missing API
- Most dashboard aggregation endpoints — may be stub or partially implemented; needs full coverage (occupancy %, daily
  throughput, pending count, revenue summary)
- Report export endpoint (CSV/PDF per report type) — likely missing
- Alert acknowledge endpoint — may be missing
- Notification mark-as-read endpoint — may be missing
- Notification mark-all-as-read endpoint — likely missing
- System backup trigger endpoint — likely missing
- Admin import/export data endpoint — likely missing

Integration description
- All dashboard stat cards and charts replaced with real backend aggregations per role
- Report screen fetches real data from backend for each report type with date range filter
- Alert center shows live unresolved alerts from backend; operator can acknowledge
- Notification bell shows real unread count and notification list from backend

Dependencies
- Phases 3–6 complete (dashboards aggregate data from operations that must exist)

Risk / Complexity
- MEDIUM — aggregation query performance is the main risk; most frontend work is straightforward data binding

  ---
Phase 8 (Final) — 3D Integration

Goal
Replace static warehouse data in the 3D project with live backend yard structure and container position data, making
the visualization reflect real yard state.

Frontend scope (3d)
- Warehouse3D scene — live slot and container rendering
- Warehouse2D grid — live slot occupancy per bay/row/tier
- WarehouseOverview — live zone fill rates and stats

Backend scope
- Yard module: zone → block → slot hierarchy
- Container position module: current slot + tier per container
- Yard occupancy summary per zone

CRUD Coverage
- READ only — 3D is a visualization layer, no write operations

Missing API
- Yard structure snapshot endpoint (full zone/block/slot tree in one response) — likely missing; current endpoints may
  be per-resource
- Container positions bulk fetch (all active positions in yard) — likely missing
- Zone occupancy summary endpoint — may be missing

Integration description
- 3D scene replaces warehouse.ts static data with live API calls for yard structure and container positions
- Slot occupancy (filled/empty/type) per bay/row/tier driven by backend container position data
- Zone fill rate stats in WarehouseOverview pulled from backend occupancy summary
- Container popup on hover shows real container metadata from backend

Dependencies
- Phase 5 complete (yard structure and container positions must be stable and fully populated)
- Phase 4 complete (real containers must be in the yard)

Risk / Complexity
- HIGH — 3D data model (ZoneInfo, SlotInfo, WHConfig) must exactly match backend response structure; performance of
  bulk yard-state fetch matters for rendering

  ---
4. Recommended Order

1. Phase 1 — Auth & Catalog Foundation
2. Phase 2 — User & Account Management CRUD
3. Phase 3 — Order / Booking Full CRUD
4. Phase 4 — Container & Gate Operations CRUD
5. Phase 5 — Yard / Slot / Position Management
6. Phase 6 — Invoice / Fee / Billing
7. Phase 7 — Dashboard, Reports & Alerts
8. Phase 8 — 3D Integration (last)

  ---
5. Notes / Warnings

- Do not refactor do-an-full structure — all integration must work within the existing page/component structure
- Multiple missing APIs identified — backend team must address these in parallel with frontend phases, especially:
  activity log controller, booking edit flow, relocation endpoints, invoice list, notification read endpoints, and
  dashboard aggregation endpoints
- Phase 5 is the critical path for Phase 8 — 3D cannot be meaningfully integrated until yard + container position data
  is live and stable
- Gate-out (Phase 4) is a pre-requisite for billing accuracy — invoice calculation depends on real gate-out
  timestamps; do not attempt Phase 6 with mock gate data
- Role-scoped data must be enforced at the backend level — frontend should not filter by role itself; all list
  endpoints must return only what the caller is authorized to see
- Supabase layer removal should happen domain by domain within each phase — avoid removing the entire Supabase client
  at once to prevent breaking screens not yet integrated