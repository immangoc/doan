There is a rendering bug in the 3D scene. The data is correct but
containers are not all showing up visually.

Evidence:
- Stat cards: Kho Lạnh 2% with 54 empty slots — correct
- Block B1 sidebar: 100% full, 0/2 slots — means B1 has 2 slots, both occupied
- 3D scene: only 1 container mesh visible in B1, second one missing

This is NOT a data bug. The occupancyStore has correct data.
This is a rendering bug — not all occupied slots are being drawn.

Step 1 — Read these files:
- 3d/src/store/occupancyStore.ts — check getOccupancyBoolGrid() and how it
  returns data per floor/tier
- 3d/src/components/WarehouseScene.tsx — find where ZoneBlock maps
  occupancy data to ContainerBlock meshes
- 3d/src/components/OverviewScene.tsx — same

Step 2 — Find the rendering logic bug:

Likely causes (check each):

A) Tier/floor indexing off-by-one:
Backend tier starts at 1. If 3D scene iterates floors starting at 0,
tier=1 container maps to floor=0 correctly but tier=2 maps to floor=1
which may not be rendered if maxFloor is hardcoded or capped wrong.

B) getOccupancyBoolGrid() only returns floor 1 data:
Check if the function correctly handles multiple tiers.
A block with 2 slots stacked (tier 1 and tier 2) needs both floors returned.

C) ZoneBlock only iterates floor index [0] instead of all available floors:
Check the floor loop — it may be hardcoded to render only 1 tier.

D) Duplicate key or position collision:
Two containers at same (row, col) but different tier may be overwriting
each other in the occupancy map, leaving only 1 entry.

Step 3 — Fix whichever cause is confirmed. Do not change data fetching logic.

Step 4 — Verify fix: after fix, a block with 2 occupied slots at different
tiers should show 2 container meshes stacked vertically in the 3D scene.

Report: which cause was it, which file and line, what was changed.