Two bugs visible in browser. Fix both now.

--- BUG 1: Container ID is NaN — 404 on all position requests ---

Network shows: GET /admin/containers/NaN/position → 404 "No position found for container: NaN"
This means when parsing the container list response, the container ID field
is being read with the wrong key.

Fix:
1. Read 3d/src/services/containerPositionService.ts
2. Find where it reads the container ID from the list response
   e.g. container.id — but API may return container.containerId or container.code
3. Call GET /admin/containers?statusName=IN_YARD&size=1 in your head and check
   the actual response shape by reading the backend ContainerController +
   ContainerResponse DTO
4. Fix the field name so container ID resolves to a real integer, not NaN

--- BUG 2: NaN% and 0/0 in zone sidebar ---

Block C2 shows NaN% and 0/0 slots.
This is caused by: capacity = 0 or undefined → occupiedSlots/0 = NaN

Fix:
1. Read 3d/src/components/OverviewScene.tsx — find where occupancy % is calculated
2. Add a guard: if capacity is 0 or undefined, show 0% instead of NaN%
3. Also check why capacitySlots is 0 for C2 — it may be a zone with no slots
   seeded in the database. If so, filter out zones with capacity=0 from display
   or show "Chưa có dữ liệu" instead of NaN%

Fix Bug 1 first — it will also reduce the 209 failed requests to 0.
Then fix Bug 2.

Do not change anything outside containerPositionService.ts and OverviewScene.tsx.
Report the exact wrong field name and what it was changed to.