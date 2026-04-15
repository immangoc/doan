Phase 4 is complete and verified. Proceed to Phase 5 — Gate-In Flow.

Before writing any code, read:
- 3d/src/data/containerStore.ts — understand findSuggestedPosition() and addImportedContainer() current logic
- 3d/src/store/occupancyStore.ts — understand how to trigger a grid reload after gate-in
- Find the Import Panel component (search for "Nhập kho" or "ImportPanel" in OverviewScene.tsx and WarehouseScene.tsx)

Then implement Phase 5:
1. Replace containerStore.findSuggestedPosition() with POST /admin/optimization/recommend
    - Send: cargoTypeName + grossWeight from the import form
    - Receive: top-5 slot suggestions with score, efficiency, moves
    - Display suggestions in the existing UI (do not redesign the panel)

2. Replace containerStore.addImportedContainer() with real 3-step flow:
    - Step 1: POST /admin/gate-in → get container ID from response
    - Step 2: POST /admin/containers/{id}/position → assign the selected slot
    - Step 3: After both succeed, re-call fetchAndSetOccupancy() to refresh the 3D grid

3. Comment out findSuggestedPosition() and addImportedContainer() in containerStore.ts — do not delete

Rules:
- If any step in the 3-step flow fails, show error and do not proceed to next step
- Keep the existing import form UI exactly as-is — only replace data logic
- After successful gate-in the 3D grid must visually update with the new container
- Handle loading state on the confirm button (disable it while requests are in flight)

Summarize what you found in the Import Panel before writing any code.