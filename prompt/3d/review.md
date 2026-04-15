# Task: Full Project Review & Bug Fix — All 8 Phases Complete

## Context

All 8 API integration phases are complete across:
- `3d` — React Three Fiber yard visualization (primary target)
- `do-an-full` — Main admin UI (already integrated, may have edge cases)
- `warehouse-service` — Java Spring Boot backend (fix only if 3d/do-an-full reveal a broken API)

Do NOT add new features. Only find and fix real bugs, broken flows, and missing edge cases.

---

## STEP 1 — Read before touching anything

Read these files to understand the full current state:

```
3d/src/services/apiClient.ts
3d/src/services/yardService.ts
3d/src/services/containerPositionService.ts
3d/src/services/gateInService.ts
3d/src/services/gateOutService.ts
3d/src/services/relocationService.ts
3d/src/services/alertService.ts
3d/src/services/containerService.ts
3d/src/services/gateInManagementService.ts
3d/src/store/yardStore.ts
3d/src/store/occupancyStore.ts
3d/src/adapters/slotGridAdapter.ts
3d/src/App.tsx
3d/src/main.tsx
3d/src/pages/Unauthorized.tsx
```

Then summarize: which services exist, what each does, and flag anything that looks incomplete or inconsistent before proceeding.

---

## STEP 2 — Systematic Review Checklist

Go through each category below. For each issue found, note: file, line/area, problem, fix applied.

---

### 2A — Auth & Token

- [ ] Token read from `?token=` URL param on boot — confirm it works when redirected from do-an-full
- [ ] Token removed from URL via `replaceState` immediately after reading
- [ ] If no token in URL and no token in localStorage → `/unauthorized` page renders correctly
- [ ] `/unauthorized` page has working "Quay lại" button pointing to `http://localhost:3000`
- [ ] All API calls in all service files use `Authorization: Bearer <token>` via apiClient
- [ ] On 401 response → redirected to `/unauthorized` (not crash, not blank page)
- [ ] Sidebar shows real decoded user name and role from JWT (not hardcoded "Phạm Thị Lan")
- [ ] Token expiry: if token is expired (JWT exp claim in the past) → redirect to `/unauthorized` on first API call

---

### 2B — Yard Structure (Phase 3)

- [ ] `fetchAllYards()` called on App boot, data stored in yardStore
- [ ] If fetch fails → scenes fall back to mock data silently (no crash, no blank screen)
- [ ] `slotGridAdapter.ts` correctly maps `rowNo/bayNo/tier` → `row/col/floor` — no off-by-one errors
- [ ] Grid dimensions are dynamic — no hardcoded `4` or `8` remaining in grid rendering logic
- [ ] All 3 scenes (OverviewScene, WarehouseScene, Warehouse2D) consume yardStore correctly
- [ ] Warehouse type mapping (cold/dry/fragile/other vs backend yard names) covers all real yard names in seed data

---

### 2C — Container Occupancy (Phase 4)

- [ ] `fetchAndSetOccupancy()` called after `fetchAllYards()` succeeds in App.tsx
- [ ] Batch fetching positions in groups of max 20 — confirm no sequential waterfall
- [ ] `occupancyStore` correctly keyed — no duplicate or missing containers
- [ ] `getOccupancyBoolGrid` returns correct boolean grid per floor/zone
- [ ] ContainerBlock tooltip shows real data when loaded: code, cargo type, weight, gate-in date, storage duration
- [ ] Falls back to seeded mock grid when occupancy data is empty (not crash)
- [ ] `countOccupiedZoneSlots` returns accurate count matching what the scene renders

---

### 2D — Gate-In Flow (Phase 5)

- [ ] Import Panel present in OverviewScene, Warehouse3D, AND Warehouse2D (Phase 6 note: WarehouseOverview.tsx was fixed late — confirm all 3 are consistent)
- [ ] Recommendation fetch: POST /admin/optimization/recommend → top-5 displayed
- [ ] If recommendation returns empty → show "Không tìm thấy vị trí phù hợp" message
- [ ] Gate-in 3-step flow: gate-in → assign position → refresh grid — if any step fails, error is shown and flow stops
- [ ] After successful gate-in: occupancyStore refreshes and new container appears in 3D scene
- [ ] Confirm button disabled while requests are in flight

---

### 2E — Gate-Out & Waiting List (Phase 6)

- [ ] Export search debounce 300ms working — not firing on every keystroke
- [ ] Gate-out confirm: container removed from local list + grid refreshes
- [ ] If gate-out API fails: error shown, container stays in list, grid unchanged
- [ ] Waiting list: real data from APPROVED orders, not hardcoded WAITING_CONTAINERS
- [ ] WAITING_CONTAINERS and EXPORT_CONTAINERS in warehouse.ts are commented out (not imported anywhere active)

---

### 2F — Management Screens (Phase 7)

- [ ] `/ha-bai` — pagination works; data loads on mount; empty state shown when no records
- [ ] `/xuat-bai` — gate-out flow works; invoice modal opens after gate-out success
- [ ] `/kho` — filter by keyword + status + type works; status history side panel opens correctly
- [ ] `/kiem-soat` — CRITICAL alerts shown in red, WARNING in amber, INFO in blue; acknowledge button works; acknowledged alerts move to bottom
- [ ] All 4 routes registered in App.tsx router
- [ ] All 4 screens use same Sidebar + Topbar layout shell as existing pages
- [ ] None of the 4 screens crash on empty API response

---

### 2G — Optimization & Relocation (Phase 8)

- [ ] "Tối ưu" button in Warehouse3D toggles OptimizationPanel open/close
- [ ] Source container selection highlights with amber glow in 3D scene
- [ ] POST /admin/optimization/recommend fires with correct params (containerId or cargoType + weight)
- [ ] Top-5 suggestions displayed; clicking one shows GhostContainer at target position
- [ ] Relocate confirm: POST /admin/yard/relocate → grid refreshes → highlights clear
- [ ] Swap confirm: POST /admin/yard/swap → grid refreshes
- [ ] If relocate/swap fails: error shown inline, grid unchanged, highlights stay for retry
- [ ] Confirm button disabled while request is in flight

---

### 2H — Global Issues

- [ ] No `console.error` left unhandled in any service (all errors caught and surfaced to UI)
- [ ] No remaining active imports of: `WH_STATS`, `WAITING_CONTAINERS`, `EXPORT_CONTAINERS`, `getGridForFloor`, `WAREHOUSES`, `ZONES` (these should all be commented out)
- [ ] Search the entire `3d/src` for `localhost:3000` hardcoded strings — confirm they only appear in `/unauthorized` redirect (not scattered in services)
- [ ] Search for `localhost:8080` — confirm it only exists in `apiClient.ts` base URL config (not repeated in service files)
- [ ] TypeScript: no `any` types introduced during integration (or explicitly justified with comment)
- [ ] No infinite re-render loops: check all `useEffect` dependency arrays in new hooks and components

---

### 2I — do-an-full Integration Point

Only check the redirect to 3d — do not touch anything else in do-an-full:

- [ ] The button/link that navigates to 3d correctly appends `?token=<JWT>` to the URL
- [ ] The token being passed is the active JWT (not expired, not undefined)
- [ ] If the user is not logged in and somehow reaches the redirect: handled gracefully

---

### 2J — warehouse-service (only if APIs are broken)

Only touch backend if a specific API is returning wrong data or wrong status codes. Check:

- [ ] `GET /admin/dashboard` returns `zoneOccupancy[]` with `yardType` or `yardName` field
- [ ] `GET /admin/containers?statusName=IN_YARD` returns containers with `gateInDate` field for storage duration calculation
- [ ] `POST /admin/optimization/recommend` accepts `containerId` OR `{cargoTypeName, grossWeight}` — confirm which is actually supported
- [ ] `POST /admin/yard/relocate` and `POST /admin/yard/swap` — confirm request body schema matches what relocationService.ts sends
- [ ] `GET /admin/alerts` returns `level` field with values INFO/WARNING/CRITICAL

If any backend API has wrong schema: fix the controller/DTO in warehouse-service and update the corresponding service file in 3d to match.

---

## STEP 3 — Fix Order

Fix issues in this priority order:

1. **Auth breaks** — anything that prevents the app from loading or causes blank screen
2. **Data not loading** — occupancy grid empty, yard structure missing, dashboard zeros
3. **Flow breaks** — gate-in/gate-out/relocate fails silently or crashes
4. **Management screens** — crashes, blank pages, broken filters
5. **Visual glitches** — highlights not clearing, ghost container stuck, wrong colors
6. **Minor** — TypeScript warnings, console errors, hardcoded strings

---

## STEP 4 — Report Format

After completing review and fixes, report in this format:

```
## Review Complete

### Bugs Found & Fixed
| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | ... | ... | ... |

### Issues Found but Deferred
| # | File | Issue | Reason deferred |
|---|------|-------|-----------------|

### Backend Changes Made (if any)
| File | What changed | Why |

### Clean Bill of Health
- Auth flow: ✅ / ⚠️
- Yard structure: ✅ / ⚠️
- Occupancy grid: ✅ / ⚠️
- Gate-in: ✅ / ⚠️
- Gate-out: ✅ / ⚠️
- Management screens: ✅ / ⚠️
- Optimization: ✅ / ⚠️
- do-an-full redirect: ✅ / ⚠️
```

---

## Rules

- Do not add new features or new screens
- Do not refactor working code for style reasons
- Do not change component structure unless it is causing a bug
- Do not touch mock data files (warehouse.ts, containerStore.ts) unless fixing an active import
- One fix at a time — confirm the app still runs after each fix before moving to the next