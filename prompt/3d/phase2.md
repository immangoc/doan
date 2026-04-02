# Task: Implement API Integration — Project `3d`

## Context

- You have already read `prompt/3d/result.md` and understand all 8 phases
- `do-an-full` is already integrated — do NOT touch it
- `warehouse-service` is already running at `http://localhost:8080`
- Your only job: implement API integration inside the `3d` project, phase by phase

---

## Token Situation

When a user navigates from `do-an-full` to the `3d` app, the token is passed via URL:

```
localhost:5173/tong-quan?token=<JWT>
```

The `3d` app must:
1. Read `?token=` from the URL on boot
2. Save it to `localStorage` (key: `'token'`)
3. Remove it from the URL immediately via `window.history.replaceState`
4. If no token found in URL and none in `localStorage` → redirect to `/unauthorized`

---

## Phase Execution Rules

- Implement one phase at a time
- Do not start the next phase until current phase is confirmed working
- Do not delete mock data until real API is confirmed working — comment it out first
- Do not restructure or rename existing components/files
- Every API call must handle: loading, error, and empty states
- After each phase the app must still run without crashes

---

## Phase 1 — Token Handoff + Auth Guard

**Files to touch:** `App.tsx` or `main.tsx`, router config, `Sidebar.tsx`

**New files to create:**
- `src/services/apiClient.ts` — base URL + auto Bearer header + 401 redirect
- `src/pages/Unauthorized.tsx` — standalone page, no sidebar

**Steps:**
1. On app boot: read `?token=` → save to localStorage → `replaceState` to clean URL
2. Auth guard: if no token anywhere → redirect to `/unauthorized`
3. `/unauthorized` page: message + button back to `http://localhost:3000`
4. `apiClient.ts`: all requests auto-attach `Authorization: Bearer <token>`, on 401 → redirect to `/unauthorized`
5. `Sidebar.tsx`: decode JWT payload (base64, no library) → show real name and role instead of hardcoded "Phạm Thị Lan / Vận hành"

**Verify before Phase 2:**
- [ ] Token is read from URL, saved, removed from URL
- [ ] Visiting 3d directly without token → `/unauthorized` page
- [ ] Sidebar shows real user info from JWT
- [ ] apiClient sends correct Authorization header

---

## Phase 2 — Dashboard Statistics

**Files to touch:** `/tong-quan` page component, stat cards section

**Steps:**
1. On mount: call `GET /admin/dashboard` via apiClient
2. Replace the 4 hardcoded occupancy cards with real `zoneOccupancy` data
3. Map zone names from backend → 4 warehouse types (cold/dry/fragile/other)
4. Show loading skeleton while fetching; on error show last value or zero with indicator
5. Comment out the `WH_STATS` mock import (do not delete)

---

## Phase 3 — Yard Structure Loading

**Files to touch:** `src/data/warehouse.ts`, `OverviewScene.tsx`, `WarehouseScene.tsx`, `Warehouse2D.tsx`

**New files to create:**
- `src/services/yardService.ts` — fetch yard → zones → blocks → slots
- `src/adapters/slotGridAdapter.ts` — convert backend slot list (rowNo/bayNo/maxTier) → 2D boolean grid

**Steps:**
1. Fetch: `GET /admin/yards` → `GET /admin/yards/{id}/zones` → `GET /admin/zones/{id}/blocks` → `GET /admin/blocks/{id}/slots`
2. Write adapter: slot list → grid array (variable size, not hardcoded 4×8)
3. Replace `WAREHOUSES`, `ZONES`, `getGrid()` with API-backed data
4. Grid renderer must handle variable dimensions after this phase
5. Comment out static constants in `warehouse.ts` (do not delete)

**⚠️ Watch:** backend uses `tier/rowNo/bayNo` — 3d scene uses `floor/row/col`. All mapping goes through the adapter only.

---

## Phase 4 — Container Positions & Slot Occupancy

**Files to touch:** `OverviewScene.tsx`, `WarehouseScene.tsx`, `Warehouse2D.tsx`, `ContainerBlock.tsx`

**Steps:**
1. Call `GET /admin/containers?statusName=IN_YARD&size=500`
2. Fetch positions in parallel batches (max 20 at a time) via `GET /admin/containers/{id}/position`
3. Use adapter from Phase 3 to map position → grid coordinates
4. Replace `getGridForFloor()` fake boolean grids with real occupancy data
5. Container tooltip reads real data: code, cargo type, weight, gate-in date, storage duration
6. Comment out mock grid generation (do not delete)

**⚠️ N+1:** Do not make 500 sequential requests. Batch them. Leave this comment where batching happens:
```
// TODO: replace with GET /admin/blocks/{blockId}/occupancy when backend adds bulk endpoint
```

---

## Phase 5 — Gate-In Flow

**Files to touch:** Import panel in `OverviewScene.tsx` and `WarehouseScene.tsx`, `containerStore.ts`

**Steps:**
1. Replace `containerStore.findSuggestedPosition()` → `POST /admin/optimization/recommend`
2. Replace `containerStore.addImportedContainer()` with real flow:
    - `POST /admin/gate-in`
    - `POST /admin/containers/{id}/position`
3. After successful gate-in: trigger Phase 4 data reload to refresh the 3D grid
4. Comment out local suggestion algorithm in `containerStore.ts`

---

## Phase 6 — Gate-Out & Waiting List

**Files to touch:** Export panel, Waiting list panel across all 3 pages

**Steps:**
1. Export list: `GET /admin/containers?statusName=IN_YARD&keyword=<search>` — replace `EXPORT_CONTAINERS`
2. Gate-out: `POST /admin/gate-out`
3. Waiting list: derive from `GET /admin/orders?statusName=APPROVED` + filter containers not yet gate-in'd
    - If logic is complex, leave: `// TODO: request GET /admin/gate-in/pending from backend`
4. Comment out `WAITING_CONTAINERS` and `EXPORT_CONTAINERS` mock arrays

---

## Phase 7 — Placeholder Screens

**Files to touch:** `/ha-bai`, `/xuat-bai`, `/kho`, `/kiem-soat` page components

All backend APIs are ready. Build each screen:
- `/ha-bai` → `GET /admin/gate-in` paginated list + assign position flow
- `/xuat-bai` → `GET /admin/containers?statusName=IN_YARD` + `POST /admin/gate-out` + invoice view
- `/kho` → `GET /admin/containers` with filter/search + status history
- `/kiem-soat` → `GET /admin/alerts` + `PUT /admin/alerts/{id}/acknowledge`

---

## Phase 8 — Optimization & Relocation Visualization

**Files to touch:** `WarehouseScene.tsx`, `Warehouse2D.tsx`

**Steps:**
1. `POST /admin/optimization/recommend` → highlight suggested slots in 3D scene
2. `POST /admin/yard/relocate` → execute move
3. `POST /admin/yard/swap` → swap two containers
4. After any operation: reload Phase 4 grid data
5. Visual: highlight source + target slot; use existing `GhostContainer.tsx` for suggested position preview

---

## Start

Begin with Phase 1. Read `3d/src/App.tsx` (or `main.tsx`) first to understand the current boot sequence, then implement.