# Claude Working Instruction — Integrate Real APIs Into All do-an-full Screens

## ROLE

You are a **senior fullstack engineer** responsible for integrating:

- Backend: `warehouse-service`
- Frontend: `do-an-full`

Your task is to **replace static/mock frontend data with real APIs from backend** and make each major screen fully usable.

---

## CURRENT ISSUE

Right now, the frontend is mostly still static.

Observed state:
- only login/logout API is being called
- most screens still do not call backend APIs
- list data is not filled from backend
- create/update/delete/detail actions are not wired to real backend

This must be fixed.

---

## OBJECTIVE

You must:

1. Review each major screen in `do-an-full`
2. Find the corresponding API/module in `warehouse-service`
3. Integrate real backend APIs into the frontend
4. Ensure each screen supports full usable flow:

- **LIST**
- **DETAIL / XEM**
- **CREATE / THÊM**
- **UPDATE / SỬA**
- **DELETE / XÓA**

If backend API is missing:
- implement the missing API in `warehouse-service`
- then wire it into `do-an-full`

---

## STRICT RULES

- Follow existing architecture of both projects
- Do not do random refactors
- Do not rewrite the whole frontend
- Do not change folder structure unless absolutely necessary
- Do not invent new business logic
- Keep UI design/layout as-is
- Only replace static/mock data and wire real flows
- Respect current backend conventions:
    - controller
    - service
    - repository
    - dto
    - response format
- Respect frontend current structure and component flow

---

## REQUIRED BEHAVIOR PER SCREEN

For every main screen/page, you must verify and complete:

### 1. LIST
- screen loads real backend data
- supports search/filter/pagination if screen has those controls

### 2. DETAIL / XEM
- “Xem” button must open real detail data from backend
- detail must not use mock/static data

### 3. CREATE / THÊM
- add/create button must call backend API
- form submit must persist dataจริง to backend

### 4. UPDATE / SỬA
- edit button/form must load current backend data
- save must update backend successfully

### 5. DELETE / XÓA
- delete action must call backend delete API
- UI must refresh correctly after deletion

If delete is not business-appropriate for a module, then:
- clearly state why
- implement the most appropriate alternative action if existing business rules require soft delete / deactivate

---

## REQUIRED REVIEW SCOPE

You must inspect both codebases carefully.

### Backend: `warehouse-service`
Read and use:
- controllers
- services
- repositories
- entities
- DTOs
- mappers
- related Flyway/data schema if needed

### Frontend: `do-an-full`
Read and use:
- pages
- components
- tables
- forms
- modals
- route structure
- current mock/static data sources
- existing auth/token flow

---

## MAIN FRONTEND SCREENS TO CHECK

At minimum, review and complete all applicable CRUD/detail flows for screens such as:

- Dashboard
- Đơn hàng
- Loại Container
- Loại Hàng
- Hãng Tàu
- Lịch Trình
- Cước Phí
- Quản trị hệ thống
- Tài khoản Admin
- Báo cáo & Thống kê
- any related admin/master-data/detail pages
- any modal/form/action opened from those pages

If there are other screens/modules in the codebase, review them too.

---

## AUTH + TOKEN RULE

While integrating APIs, you must preserve and correctly use the existing auth flow:

- all protected API calls must send token
- user must be logged in to access internal screens
- role-based access must continue to work
- do not break login/logout flow

---

## EXECUTION ORDER

You must work in this order:

### Step 1 — Audit frontend screens
For each screen:
- identify if data is static/mock
- identify which actions are missing
- identify corresponding backend APIs

### Step 2 — Audit backend coverage
For each frontend need:
- check whether backend already has list/detail/create/update/delete APIs
- if missing, add them in backend following project architecture

### Step 3 — Integrate screen by screen
For each screen:
- connect list API
- connect detail API
- connect create API
- connect update API
- connect delete API
- refresh UI state after operations
- remove mock/static data usage

### Step 4 — Verify end-to-end behavior
For each screen:
- list works
- detail works
- create works
- update works
- delete works
- token is sent
- UI updates correctly

---

## OUTPUT FORMAT

You must report work in this structure:

# 1. Screen Audit Result

For each screen, mark current state before fixing:

Example:
- Orders: LIST ❌ DETAIL ❌ CREATE ❌ UPDATE ❌ DELETE ❌
- Container Types: LIST ❌ DETAIL ❌ CREATE ❌ UPDATE ❌ DELETE ❌

---

# 2. Backend API Coverage Review

For each module, mark:
- existing APIs
- missing APIs added
- APIs fixed

Example:
## Container Type
- GET list: existed
- GET detail: added
- POST create: existed
- PUT update: added
- DELETE: added

---

# 3. Frontend Integration Result

For each screen, mark final result:

- LIST ✅
- DETAIL ✅
- CREATE ✅
- UPDATE ✅
- DELETE ✅

Also mention:
- files changed
- mock data removed
- forms/modals wired
- table actions wired

---

# 4. Changed Files

List all changed files clearly, grouped by:

## Backend
- ...

## Frontend
- ...

---

# 5. Final Verification

Confirm:
- all major screens now use real backend APIs
- login/logout still works
- protected API calls send token
- each major screen has usable view/create/update/delete behavior
- remaining gaps (if any) are clearly listed

---

## IMPORTANT IMPLEMENTATION RULES

### Backend
- keep controller thin
- business logic in service
- repository only for persistence
- use DTO/request/response properly
- keep naming and package structure consistent

### Frontend
- keep current UI layout and structure
- do not redesign pages
- only wire real data/actions
- handle loading/error/success states reasonably
- keep role-based access behavior intact

---

## VERY IMPORTANT

Do NOT stop after only connecting list APIs.

You must ensure each applicable screen has:

- real list
- real detail
- real create
- real update
- real delete

If backend is missing something, add it and continue until the screen is actually usable.

This is a **full API integration + CRUD completion task for do-an-full**.