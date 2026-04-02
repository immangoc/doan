Root cause is clear from the database screenshots.

container_positions table has only 6 rows.
But the scene still shows some blocks as 100% full — because when real
position data is sparse, the code falls back to mock seeded grid which
randomly fills slots.

The fallback is wrong. It should show REAL data only, even if empty.

--- TASK 1: Remove the mock fallback in occupancy rendering ---

Read 3d/src/components/OverviewScene.tsx and WarehouseScene.tsx.

Find this pattern (somewhere in ZoneBlock or similar):
if (occupancyMap.size > 0) {
// use real data
} else {
// fallback to seeded mock grid ← THIS IS THE BUG
}

Fix: Remove the else/fallback branch entirely.
When occupancyStore has loaded (even if empty for this zone),
always use real data — show 0 containers if 0 have positions.
Only use mock fallback if occupancyStore has NOT yet loaded at all
(loading state, before first API call completes).

--- TASK 2: Fix occupancy % calculation ---

The % should be:
occupied = number of containers with valid position in this block
capacity = total slots in this block from yardStore
% = occupied / capacity * 100

If occupied = 0 → show 0%, not mock %
If capacity = 0 → show "Chưa có dữ liệu"

Find where this calculation happens and fix it.

--- TASK 3: Add more seed positions to DB ---

The 6 existing positions are correct. Add more so the scene shows
meaningful data across all 4 warehouse types.

Read what slot_ids exist in the slots table for each zone, then
write SQL to insert into container_positions for:
- 2-3 containers in cold zone (Kho Lạnh)
- 2-3 containers in dry zone (Kho Khô)
- 1-2 containers in fragile zone (Kho Hàng dễ vỡ)
- 1-2 containers in other zone (Kho Khác)

Use containers that have status IN_YARD and don't already have a position.

Do TASK 1 and 2 first (frontend fix), then TASK 3 (seed data).
After both: blocks with 0 real positions must show 0%, not 100%.