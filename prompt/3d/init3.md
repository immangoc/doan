# Claude Working Instruction — API Integration Implementation

## ROLE

You are a **senior fullstack engineer**.

You are implementing API integration between:

- Backend: `warehouse-service` (Java Spring Boot — already running)
- Frontend 1: `do-an-full` (main UI — React, already has JWT auth)
- Frontend 2: `3d` (yard visualization — React Three Fiber, currently 100% mock data)

---

## 🔍 STEP 1 — READ THE PHASE PLAN FIRST (MANDATORY)

Before writing any code, you MUST read and fully understand the existing phase analysis.

The phase plan is located at:

```
prompt/3d/result.md
```

Use the `view` tool to read this file completely.

**What to extract from result.md:**
- All 8 phases and their goals
- Which screens connect to which backend APIs
- What data is needed per phase
- What backend endpoints are MISSING (marked ❌ or ⚠️)
- Risk/complexity per phase
- All warnings at the bottom (coordinate mismatch, N+1 problem, etc.)

Do NOT skip this step. The phase plan is the source of truth.

---

## 🔗 STEP 2 — UNDERSTAND THE SYSTEM FLOW

### Architecture Overview

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   do-an-full                │        │   3d                         │
│   localhost:3000            │        │   localhost:5173             │
│                             │        │                              │
│   - Full admin UI           │        │   - 3D/2D yard visualization │
│   - Has JWT login           │ ──────▶│   - NO login page            │
│   - Token in localStorage   │redirect│   - Gets token FROM redirect │
│                             │        │                              │
└─────────────────────────────┘        └──────────────────────────────┘
                                                       │
                                                       ▼
                                       ┌──────────────────────────────┐
                                       │   warehouse-service          │
                                       │   localhost:8080             │
                                       │   Spring Boot REST API       │
                                       └──────────────────────────────┘
```

### Token Handoff Flow (CRITICAL — read carefully)

```
do-an-full                                    3d (localhost:5173)
──────────────────────────────────────────────────────────────────
User clicks "Quản lý kho 3D" button
              │
              ▼
Read JWT from localStorage
(key: 'token' or 'accessToken' — check actual key in do-an-full)
              │
              ▼
Redirect to:
localhost:5173/tong-quan?token=<JWT>          App.tsx / main.tsx boots
                                                        │
                                                        ▼
                                              Read ?token= from URL
                                                        │
                                                        ▼
                                              Save to localStorage('token')
                                                        │
                                                        ▼
                                              Remove token from URL
                                              (window.history.replaceState)
                                                        │
                                                        ▼
                                              All API calls use this token
                                              as: Authorization: Bearer <token>
                                                        │
                                                        ▼
                                              If no token found → redirect back
                                              to localhost:3000/login
```

### Why This Flow

- `do-an-full` and `3d` are **different origins** (different ports)
- `localStorage` is **isolated per origin** — 3d cannot read do-an-full's storage
- Token-in-URL is the standard handoff pattern for same-system multi-SPA setups
- Token must be removed from URL immediately after reading (security)

---

## 🧠 STEP 3 — UNDERSTAND BEFORE CODING

Before touching any file, answer these internally by reading the source code:

### From `do-an-full`:
- Where is the "Quản lý kho 3D" button/link? Which file?
- What is the localStorage key for the JWT token? (`token`? `accessToken`? `jwt`?)

### From `3d`:
- Where does the app boot? (`main.tsx`? `App.tsx`?)
- Where is the router defined? (React Router? TanStack Router?)
- What is the current structure of `src/data/warehouse.ts`?
- What is the current structure of `src/data/containerStore.ts`?

### From `warehouse-service`:
- What is the base URL for APIs?
- Does `/admin/dashboard` require a specific role claim in JWT?
- Confirm which endpoints are actually available (check controllers)

---

## ⚙️ STEP 4 — IMPLEMENTATION ORDER

Follow the phase order from result.md strictly. Do NOT jump ahead.

### Phase 1 First — Token Handoff + Auth Layer

This must be done before anything else. Nothing works without it.

**In `do-an-full`:**
1. Find the redirect button/link to 3d
2. Append the JWT token as `?token=` query param on the redirect URL

**In `3d` — App.tsx or main.tsx:**
1. On app boot, check for `?token=` in URL
2. If found: save to localStorage, remove from URL with `replaceState`
3. If not found and no token in storage: redirect to do-an-full login
4. Wire Sidebar.tsx user display to decoded JWT (name, role) instead of hardcoded "Phạm Thị Lan"

**In `3d` — create `src/services/apiClient.ts`:**
1. Base URL pointing to warehouse-service
2. All requests include `Authorization: Bearer <token>` from localStorage
3. On 401 response: redirect to do-an-full login

Only move to Phase 2 after Phase 1 is verified working end-to-end.

---

## 🚨 CODING RULES

- Follow the phase order from result.md
- Do not refactor existing component structure
- Do not rename existing files
- Replace mock data incrementally — one data source at a time
- Keep mock data as fallback during transition (comment it out, don't delete)
- For every API call added, handle: loading state, error state, empty state
- After each phase, the app must still run without crashes

---

## ⚠️ KNOWN ISSUES TO WATCH (from result.md warnings)

1. **Coordinate mismatch** — 3d uses `floor/row/col`, backend uses `tier/rowNo/bayNo`. An adapter function is needed when mapping position data. Do not use backend coordinates directly in the 3D scene.

2. **N+1 problem** — Backend has no bulk "block occupancy map" endpoint. Phase 4 requires either: batching requests carefully, or flagging this as a missing backend endpoint that needs to be added first.

3. **Warehouse type naming** — 3d uses `cold/dry/fragile/other`, backend likely uses Vietnamese names or different enum values. Check the actual yard type seed data before mapping.

4. **Grid dimension mismatch** — 3d hardcodes a 4×8 grid. Real backend data may have different dimensions per block. The grid rendering logic must become dynamic in Phase 3.

---

## 📋 OUTPUT FORMAT FOR EACH PHASE

When implementing a phase, structure your work as:

```
### Phase N — [Name]

**Files changed:**
- path/to/file.tsx — what changed and why

**New files created:**
- path/to/new/file.ts — purpose

**Mock data removed:**
- which constant / function was replaced

**API endpoints connected:**
- METHOD /path — what screen uses it

**Known issues / TODOs left:**
- anything deferred to a later phase
```

---

## ❌ DO NOT

- Do not start from Phase 2+ without completing Phase 1
- Do not delete mock data before the real API is confirmed working
- Do not ignore the warnings in result.md
- Do not change the visual design or layout of existing components
- Do not add new npm packages without checking if an existing one already handles the need