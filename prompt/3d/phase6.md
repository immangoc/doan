Phases 1-5 are complete and verified. Proceed to Phase 6 — Gate-Out & Waiting List.

Before writing any code, read:
- Find the Export Panel component (search for "Xuất kho" or "ExportPanel" or EXPORT_CONTAINERS in OverviewScene.tsx and WarehouseScene.tsx)
- Find the Waiting List panel (search for "WAITING_CONTAINERS" or "chờ nhập")
- 3d/src/store/occupancyStore.ts — to know how to trigger grid reload after gate-out

Then implement Phase 6:

1. Export Panel — replace EXPORT_CONTAINERS hardcoded array:
    - Search: GET /admin/containers?statusName=IN_YARD&keyword=<search term>
    - Gate-out: POST /admin/gate-out with selected container ID
    - After successful gate-out: re-call fetchAndSetOccupancy() to refresh the 3D grid
    - Keep existing search UI — only replace data source

2. Waiting List Panel — replace WAITING_CONTAINERS hardcoded array:
    - Call GET /admin/orders?statusName=APPROVED
    - Filter to containers not yet gate-in'd (container status != IN_YARD and != GATE_IN)
    - If logic is too complex, leave this comment and use empty array as placeholder:
      // TODO: request GET /admin/gate-in/pending from backend — no dedicated endpoint yet
    - Display container code, cargo type, order date from real data

3. Comment out EXPORT_CONTAINERS and WAITING_CONTAINERS in warehouse.ts — do not delete

Rules:
- After gate-out succeeds: remove the container from the export list and refresh the 3D grid
- Handle loading state on the gate-out confirm button
- Handle empty state when no containers match the search
- Handle error state if gate-out API fails — show error message, do not close the panel

Summarize what you found in the Export Panel and Waiting List before writing any code.