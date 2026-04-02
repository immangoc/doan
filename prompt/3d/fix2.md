There are 2 bugs to fix. Read before touching anything.

--- BUG 1: Stat cards show 0% but 3D scene shows 100% full ---

The top stat cards (Kho Lạnh 0%, Kho Khô 0%, etc.) are always showing 0%
and "0 vị trí trống" even though the 3D scene correctly shows containers
and the sidebar panel shows "100% - 0/2 vị trí trống".

This means:
- The occupancyStore (Phase 4) has correct real data → scene renders right
- The dashboard stats (Phase 2) from GET /admin/dashboard are returning 0
  or the zone name mapping is failing silently

Steps to debug:
1. Read 3d/src/hooks/useDashboardStats.ts — check the inferWHType() mapping function
2. Open browser Network tab mentally: what does GET /admin/dashboard actually return?
   Read warehouse-service DashboardController to see the exact response shape
3. Check if zoneOccupancy[] field names match what useDashboardStats expects
   (yardType? yardName? type? name? — confirm the exact field name)
4. Fix the mapping so stat cards show the correct occupancy % from backend

--- BUG 2: Optimization returns no suggestions despite empty slots existing ---

POST /admin/optimization/recommend returns empty or no valid suggestions.
The sidebar shows a zone at 100% with 0/2 slots — so that zone IS full.
But other zones should have empty slots.

Steps to debug:
1. Read warehouse-service OptimizationController and the recommend logic
2. Check what params the frontend sends: read 3d/src/services/gateInService.ts
   and/or 3d/src/services/relocationService.ts — find the recommend call
3. Confirm the request body matches exactly what the backend expects
   (containerId? cargoTypeName? grossWeight? sizeType? yardId?)
4. Check if the backend recommend logic filters by yardId — if frontend sends
   wrong yardId or null yardId, backend may search in a full zone only
5. Check backend seed data: are there actually empty slots across all zones?
   Read V2__seed_data.sql or V5__test_data.sql to confirm slot availability

Fix both bugs. Do not change anything outside of:
- 3d/src/hooks/useDashboardStats.ts (Bug 1)
- 3d/src/services/gateInService.ts or relocationService.ts (Bug 2)
- warehouse-service OptimizationController if request schema is wrong (Bug 2)

Report: what the actual field names were, what was wrong, what you changed.