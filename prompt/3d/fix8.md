Two separate tasks. Do them in order.

--- TASK 1: Read and fix test data ---

Read warehouse-service/src/main/resources/db/migration/V5__test_data.sql

Understand:
- Which containers exist and what status they have
- Which containers have positions in container_positions table
- Which containers have APPROVED orders but no gate-in yet (these should
  appear in waiting list)
- Which containers have status AVAILABLE (not yet in yard)

Then fix the test data in a new migration V8__fix_test_data.sql:

Rule 1 — Containers with IN_YARD status MUST have a row in container_positions.
Find all containers with status_id = IN_YARD and no position → add their
positions using real slot_ids that exist in the slots table.
This fixes the 404 on position fetch for existing IN_YARD containers.

Rule 2 — Containers that should appear in "waiting list" (Danh sách chờ nhập kho):
These are containers that have an APPROVED order but have NOT been gate-in'd yet.
Their status should be AVAILABLE (not IN_YARD).
Make sure at least 3-5 containers have:
- status = AVAILABLE
- a linked order with status = APPROVED
- NO row in container_positions
  These will show up in the waiting list panel so operators know what to import.

Rule 3 — Do NOT create containers with IN_YARD status and no position.
That is the root cause of all the 404 errors.

--- TASK 2: Fix assign position 500 error ---

Network shows:
- recommend → returns "C2 - Tầng 1 - R1C2" as suggested position
- gate-in → creates container CTV-1001-2934
- position assign → POST /admin/containers/CTV-1001-2934/position → 500 INTERNAL_ERROR
- Also: GET /admin/containers/CTV-1001-2934 → 404 CONTAINER_NOT_FOUND

This means: the gate-in created a record but the container ID returned
is not being found by the position endpoint.

Fix steps:
1. Read warehouse-service GateInServiceImpl — what does POST /admin/gate-in return?
   Does it return the containerId or just a receipt?
2. Read 3d/src/services/gateInService.ts — what field does frontend read
   from gate-in response to get containerId for the next step?
3. If gate-in returns a receipt object and containerId is nested inside
   (e.g. response.data.container.id or response.data.containerId) — fix
   the frontend to read the correct field
4. Read ContainerPositionController — does it accept containerId as String
   or Integer? Does CTV-1001-2934 format match what it expects?

Fix the field mapping in gateInService.ts so the correct containerId flows
into the position assign call.

Do TASK 1 (SQL migration) first, then TASK 2 (position assign fix).
Report: which containers now have positions, which are in waiting list,
and what was the wrong field name in gate-in response.