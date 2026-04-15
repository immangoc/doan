Two separate bugs. Read network tab evidence carefully.

Evidence from browser:
- GET /admin/containers?statusName=IN_YARD → returns containers like CONT0005
- GET /admin/containers/CONT0005/position → 404 "No position found"
- This means: containers exist with IN_YARD status but have NO slot assigned
- Scene falls back to seeded mock grid → shows fake "full" blocks

--- BUG 1: Containers without position are counted as occupying a slot ---

Read 3d/src/services/containerPositionService.ts

Current logic likely:
1. Fetch all IN_YARD containers → get list of N containers
2. Fetch position for each → some return 404
3. On 404: container is silently skipped OR still counted

Fix:
- When position fetch returns 404, skip that container completely
- Do NOT count it toward occupancy
- Do NOT add it to occupancyStore
- Only containers with a valid position (200 response) should appear in the grid

--- BUG 2: Block occupancy % calculated from container count, not slot data ---

The sidebar shows "0/2 slots" but 100% — this means occupied count > 0
but the math uses wrong numbers.

Read where countOccupiedZoneSlots() is called and how capacity is determined.

Fix:
- occupiedCount = number of containers with valid positions in this zone
- capacity = total slots in this zone from yardStore (not from container count)
- If occupiedCount = 0 (all positions 404), show 0% not 100%

--- BUG 3: Seed data has containers without positions ---

Read warehouse-service V2__seed_data.sql or V5__test_data.sql

Check: are there INSERT statements for container_position table?
If containers exist with IN_YARD status but no rows in container_position:
- Either add seed positions for these containers in the SQL
- Or this is expected (they were created but never assigned a slot)

If seed data has no positions at all: add INSERT INTO container_position
for a few containers so the 3D scene can show real data.

Fix order:
1. Fix BUG 1 first — skip 404 positions silently
2. Fix BUG 2 — recalculate % correctly
3. Check BUG 3 — if no seed positions exist, add some to see real rendering

Report: how many containers have valid positions after fix, and what %
of position fetches return 200 vs 404.