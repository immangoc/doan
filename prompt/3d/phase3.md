Good. Phase 1 and 2 confirmed.

Proceed to Phase 3 — Yard Structure Loading.

Before writing any code, read these files first:
- 3d/src/data/warehouse.ts — understand the current WAREHOUSES, ZONES, getGrid() structure
- 3d/src/components/OverviewScene.tsx — see how yard structure is consumed in 3D
- 3d/src/components/WarehouseScene.tsx — same
- 3d/src/components/Warehouse2D.tsx — same

Then implement Phase 3 per spec:
1. Create src/services/yardService.ts — fetch yards → zones → blocks → slots
2. Create src/adapters/slotGridAdapter.ts — convert slot list (rowNo/bayNo/maxTier) → 2D grid array
3. Replace WAREHOUSES, ZONES, getGrid() with API-backed data
4. Grid dimensions must be dynamic — not hardcoded 4×8

Remember:
- Comment out static constants in warehouse.ts, do not delete
- The adapter is the ONLY place where tier/rowNo/bayNo maps to floor/row/col
- After this phase, all 3 scenes must still render without crashes

Summarize what you found in the 4 files before writing any code.