Phases 1-7 are complete. This is the final phase — Phase 8: Optimization & Relocation Visualization.

Before writing any code, read:
- 3d/src/components/WarehouseScene.tsx — understand current 3D scene structure
- 3d/src/components/Warehouse2D.tsx — understand current 2D grid structure
- 3d/src/store/occupancyStore.ts — understand how to read current slot occupancy
- 3d/src/adapters/slotGridAdapter.ts — understand coordinate mapping

Then implement Phase 8:

1. Optimization Panel (new panel in WarehouseScene and Warehouse2D):
    - User selects a container currently in yard (from occupancyStore)
    - POST /admin/optimization/recommend with that container's ID or cargoTypeName + grossWeight
    - Display top-5 suggested target slots with score and efficiency
    - Highlight the suggested target slots in the 3D/2D scene (use existing GhostContainer.tsx for 3D preview)
    - User selects one suggestion → confirm to execute

2. Relocate action:
    - POST /admin/yard/relocate with containerId + target slot
    - On success: re-call fetchAndSetOccupancy() to refresh the grid
    - Show success message, clear highlights

3. Swap action (optional button per container):
    - User selects two containers
    - POST /admin/yard/swap with containerIdA + containerIdB
    - On success: refresh grid

4. Visual feedback in 3D scene:
    - Source slot (container to move): highlight with amber/orange tint
    - Target slot (suggested position): use GhostContainer.tsx already in codebase
    - After relocation: highlights clear, grid refreshes with real positions

Rules:
- Do not redesign any existing panel layout — add the optimization panel as an addition
- Relocation and swap must always be followed by fetchAndSetOccupancy() grid refresh
- Handle loading state on confirm button (disable while request is in flight)
- Handle error: if relocate fails, show error message and keep current grid unchanged
- This is the last phase — after completion confirm all 8 phases are working end-to-end

Summarize what you found in WarehouseScene and Warehouse2D before writing any code.