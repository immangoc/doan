Phases 1-6 are complete and verified. Proceed to Phase 7 — Placeholder Screens.

Before writing any code, read the current state of these 4 placeholder pages:
- 3d/src/pages/HaBai.tsx
- 3d/src/pages/XuatBai.tsx
- 3d/src/pages/Kho.tsx
- 3d/src/pages/KiemSoat.tsx

Note the existing layout structure (Sidebar, Topbar, wrapper divs) so new content fits the same shell.

Then implement each screen using the existing apiClient and service pattern from previous phases:

1. /ha-bai — Gate-In Management
    - GET /admin/gate-in (paginated) — list of gate-in records with timestamps, container code, operator
    - Show as a table with pagination controls
    - Each row: container code, cargo type, assigned slot (block/row/bay/tier), gate-in time, operator

2. /xuat-bai — Gate-Out Management
    - GET /admin/containers?statusName=IN_YARD — export queue list
    - POST /admin/gate-out — gate-out action per container
    - GET /admin/gate-out/{id}/invoice — view invoice after gate-out
    - Show invoice in a modal or expandable row

3. /kho — Container Management
    - GET /admin/containers with filter params (keyword, statusName, type)
    - Show as searchable/filterable table
    - Click a row: GET /admin/containers/{id}/status-history — show history in a side panel or modal

4. /kiem-soat — Alerts & Incidents
    - GET /admin/alerts — list of alerts (zone, level: INFO/WARNING/CRITICAL, message, timestamp)
    - PUT /admin/alerts/{id}/acknowledge — mark alert as acknowledged
    - Color-code rows by level: INFO=blue, WARNING=amber, CRITICAL=red
    - Acknowledged alerts visually dimmed or moved to bottom

Rules:
- Use the same layout shell (Sidebar + Topbar) as existing pages — do not create new layout components
- Create a new service file per screen: gateInManagementService.ts, containerService.ts, alertService.ts
- Each screen must handle loading, error, and empty states
- Do not touch OverviewScene, WarehouseScene, Warehouse2D or any Phase 1-6 files
- Implement all 4 screens before marking Phase 7 complete

Summarize the current state of each placeholder page before writing any code.