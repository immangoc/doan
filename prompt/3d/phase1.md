# Claude Working Instruction — Full Real API Integration for 3D App

## ROLE

You are a **senior fullstack architect + senior frontend/backend integration engineer**.

Projects:

- Frontend visualization app: `3d`
- Backend API app: `warehouse-service`
- Admin app already links into 3D app from the warehouse management entry

Your task now is to **implement the real integration**, not just analyze it.

---

## OBJECTIVE

You must turn the `3d` project from a fake-data demo into a real API-driven warehouse visualization and operation app.

This means:

- remove fake/static/mock data
- connect to real APIs from `warehouse-service`
- make real yard/zone/block/slot/container data drive the UI
- ensure newly imported / newly assigned containers appear in:
    - **3D scene**
    - **2D floor plan**
- implement missing backend APIs if needed
- build out placeholder pages if backend support already exists

---

## VERY IMPORTANT CONTEXT

The 3D project currently has:
- real pages/routes already built
- fake/static warehouse data
- fake/static waiting/export/container grid data
- no real API integration

The prior analysis already identified:
- which screens exist
- which backend APIs already support them
- which backend APIs are missing
- which phases should be implemented in what order
- important issues such as occupancy endpoint and waiting-list endpoint gaps
- model mismatch between frontend grid and backend rowNo/bayNo/tier
- the fact that both **3D** and **2D** views must reflect the same real backend state
- placeholder pages that should be implemented because backend coverage is already ready

You must follow that direction closely. :contentReference[oaicite:1]{index=1}

---

## CRITICAL TOKEN / AUTH REQUIREMENT

This is VERY IMPORTANT:

The `3d` app is opened from the admin/warehouse management app.

When the admin app navigates to:

- `http://localhost:5173/tong-quan`

the authentication token must come along so that the `3d` app can call protected APIs in `warehouse-service`.

You must implement a practical token handoff strategy and wire the `3d` app auth layer accordingly.

### Required behavior
- when opening `http://localhost:5173/tong-quan` from the admin app, the token must be carried into the 3D app
- the 3D app must read/store/use that token
- all protected API calls from `3d` must send that token
- if token is missing/invalid, the 3D app must fail gracefully or redirect appropriately based on existing app behavior

Use the simplest robust solution that fits the current architecture, for example:
- token via query param + immediate secure local storage/session storage handoff, then clean URL
- or token via shared browser storage if both apps can access the same origin strategy
- but do NOT hand-wave this requirement

You must implement this fully, not just mention it.

---

## REQUIRED IMPLEMENTATION SCOPE

You must implement the real integration for the `3d` app, covering the existing phase plan.

At minimum, handle these areas:

### 1. Auth / API foundation
- add real API service layer
- token handling for the 3D app
- token handoff from admin app → 3D app
- authenticated API calls

### 2. Dashboard / Overview
- replace fake occupancy cards
- replace fake waiting-to-enter counts/lists
- replace fake summary stats
- use real backend data

### 3. Real yard hierarchy
- load yards / zones / blocks / slots from backend
- stop using hardcoded warehouse structure from fake data files

### 4. Real container positions
- render actual containers from backend position data
- both:
    - 3D scene
    - 2D floor plan
- must update correctly after import / assign / relocate / gate-out

### 5. Import (Nhập kho)
- use real optimization recommendation API
- use real gate-in API
- use real container position assignment API
- after success, refresh scene and floor plan so new container appears immediately

### 6. Export (Xuất kho)
- use real searchable in-yard container list
- use real gate-out flow
- refresh scene/floor plan after export so removed container disappears

### 7. Waiting list
- replace fake waiting container list with real backend data
- if backend missing dedicated endpoint, add it

### 8. Placeholder pages
Implement real functionality for currently placeholder screens if backend APIs are already ready:
- `/ha-bai`
- `/xuat-bai`
- `/kho`
- `/kiem-soat`

### 9. Optimization / relocation visualization
If current phase reaches this scope, wire:
- recommendation data
- relocate/swap actions
- visual refresh after move

---

## VERY IMPORTANT REAL-TIME BEHAVIOR

### Core requirement:
Whenever a **new container appears in the system** and gets assigned into the yard,
it must also appear in:

- **3D visualization**
- **2D floor plan**

Likewise:
- if container moves → both views update
- if container is gate-out → both views update
- if relocation/swap happens → both views update

You may use refetch/reload-based synchronization if that is simplest and stable.
Socket is NOT required unless already naturally present.
Simple consistent state refresh is acceptable.

---

## REMOVE ALL FAKE DATA

You must remove or stop using fake data sources such as:
- warehouse.ts fake structure/stats
- containerStore.ts in-memory fake logic where it conflicts with real persistence
- seeded boolean grid logic
- hardcoded waiting containers
- hardcoded export containers
- hardcoded occupancy stats
- fake alerts/incidents
- fake placeholder cards/tables if real backend already supports them

The page must use:
- real API data
- or loading / empty / error states

But NOT fake business data.

---

## BACKEND RULES

You are allowed to add/fix backend APIs in `warehouse-service` if the 3D integration requires them.

Use existing architecture:
- controller
- service
- repository
- dto

Keep controller thin.
Keep business logic in service.
Keep naming and package structure consistent.

### Specifically, if missing, implement cleanly:
- block occupancy map endpoint
- reverse lookup / position-friendly endpoint(s)
- pending gate-in / waiting list endpoint
- any aggregation endpoint needed by the 3D overview
- any full-structure endpoint that meaningfully reduces N+1 problems

Do not invent random APIs unless the 3D UI actually needs them.

---

## FRONTEND RULES

For project `3d`:

- keep current UI and layout as much as possible
- do not redesign the app unnecessarily
- adapt current components to real data
- preserve the existing route structure unless absolutely necessary
- implement adapter logic where backend shape differs from current UI model
- handle loading, error, empty states properly

---

## MANDATORY EXECUTION ORDER

You must implement in this order:

### Step 1 — Auth and token handoff
- make token pass from admin app to 3D app
- make 3D app read/store/use token
- wire base API client

### Step 2 — Replace top-level dashboard/overview fake data
- occupancy cards
- waiting list card
- summary data

### Step 3 — Load real yard hierarchy
- yards
- zones
- blocks
- slots

### Step 4 — Load real container positions and render them
- 3D scene
- 2D floor plan
- tooltip/detail data

### Step 5 — Wire gate-in/import flow
- recommendation
- gate-in
- assign position
- refresh both views

### Step 6 — Wire gate-out/export flow
- search in-yard containers
- gate-out
- refresh both views

### Step 7 — Implement waiting list and placeholder pages
- if backend already ready, finish those screens

### Step 8 — Implement optimization / relocation visualization
- only after position/state is stable

---

## REQUIRED OUTPUT FORMAT

You must report in this structure:

# 1. Auth & Token Handoff
- how token is passed from admin app to 3D app
- where token is stored in 3D app
- how protected API calls use it

---

# 2. Fake Data Removal
List which fake/static sources were removed or no longer used:
- warehouse structure
- occupancy stats
- waiting/export lists
- placeholder demo data
- in-memory mock stores

---

# 3. Backend Changes
List all backend additions/fixes:
- controllers
- services
- repositories
- DTOs
- new endpoints
- query optimizations

---

# 4. Frontend Changes
List all 3D frontend changes:
- auth layer
- API client/service layer
- overview page
- 3D page
- 2D page
- import/export flows
- placeholder pages
- state refresh logic

---

# 5. Functional Verification

Explicitly confirm:

- token is carried from admin app to 3D app ✅/❌
- 3D app can call protected APIs ✅/❌
- overview cards use real data ✅/❌
- 3D scene uses real container positions ✅/❌
- 2D floor plan uses real slot/container data ✅/❌
- new container appears in both 3D and 2D after import ✅/❌
- moved/relocated container updates in both views ✅/❌
- gate-out removes container from both views ✅/❌
- waiting list uses real data ✅/❌
- placeholder pages implemented with real APIs where supported ✅/❌
- fake data removed ✅/❌

---

# 6. Remaining Gaps
List only real remaining gaps if anything is still not complete.

---

## FINAL WARNING

Do NOT stop after only wiring a few cards.

Do NOT stop after only making API calls.

You must continue until:

- the `3d` app is actually driven by real backend data
- token handoff from admin app works
- both **3D** and **2D** views reflect real container state
- newly added containers show up in both views
- fake data is no longer driving the app
- placeholder pages are implemented where backend support already exists

This is a full implementation task, not just a review.