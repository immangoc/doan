Phase 3 is complete and verified. Proceed to Phase 4 — Container Positions & Slot Occupancy.

Before writing any code, read:
- 3d/src/adapters/slotGridAdapter.ts — understand the coordinate adapter from Phase 3
- 3d/src/store/yardStore.ts — understand current yard data structure
- 3d/src/components/OverviewScene.tsx — how grid data is currently consumed
- 3d/src/components/WarehouseScene.tsx — same
- 3d/src/components/Warehouse2D.tsx — same

Then implement Phase 4:
1. Call GET /admin/containers?statusName=IN_YARD&size=500 to get all containers in yard
2. Fetch positions in parallel batches of max 20 at a time via GET /admin/containers/{id}/position
3. Use the existing adapter from slotGridAdapter.ts to map (rowNo/bayNo/tier) → grid coordinates
4. Replace getGridForFloor() fake boolean grids with real occupancy data in all 3 scenes
5. ContainerBlock.tsx tooltip must show real data: code, cargo type, weight, gate-in date, storage duration
6. Comment out getGridForFloor() mock calls — do not delete

Rules:
- Do NOT make sequential requests — batch max 20 in parallel
- Add this comment where batching happens:
  // TODO: replace with GET /admin/blocks/{blockId}/occupancy when backend adds bulk endpoint
- Handle loading, error, and empty states in all 3 scenes
- App must still run without crashes after this phase

Summarize what you found in the 5 files before writing any code.