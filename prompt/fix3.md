# Claude Working Instruction — Real API Integration, Remove Fake Data, Full CRUD Completion

## ROLE

You are a **senior fullstack engineer** working on:

- Backend: `warehouse-service`
- Frontend: `do-an-full`

Your job is to **integrate real backend APIs into the actual rendered frontend screens**, remove fake/mock/static data, and complete all required CRUD flows.

---

## CURRENT PROBLEM

The app still shows fake/static data on many screens even after previous edits.

Observed issues:
- many files were edited, but visible UI still does not change correctly
- screens still display fake/mock rows, fake cards, fake stats, fake charts
- browser network often shows only auth calls or very few business API calls
- some edited files may not be the actual components rendered by routes
- many pages still do not have real:
  - list
  - detail
  - create
  - update
  - delete

This must be fixed properly.

---

## OBJECTIVE

You must do ALL of the following:

1. Find the **actual routed component** for each visible screen
2. Identify exactly where fake/static/mock data is coming from
3. Remove fake data from the actual rendered screens
4. Connect each screen to the correct real API in `warehouse-service`
5. Ensure required screens support:
  - **LIST**
  - **DETAIL / XEM**
  - **CREATE / THÊM**
  - **UPDATE / SỬA**
  - **DELETE / XÓA**
6. Only report completion if the browser-visible page is actually using backend data

---

## STRICT RULES

- DO NOT edit random similarly named files and assume they are used
- DO NOT leave fake arrays/constants in actual rendered screens
- DO NOT keep fake fallback business data
- DO NOT report success unless real API requests are actually triggered
- DO NOT rewrite the whole frontend
- DO NOT change folder structure unless absolutely necessary
- DO NOT redesign UI
- DO NOT invent business logic outside the existing codebase
- Keep current architecture of both backend and frontend

---

## MANDATORY EXECUTION METHOD

For each screen, you must follow this order:

### Step 1 — Route Truth Check
Find:
- actual route path
- actual mounted component
- any wrapper/section/merged/admin/role-based parent component
- whether there are duplicated or dead files not actually used

You must modify the component that is REALLY rendered.

---

### Step 2 — Fake Data Audit
Identify all fake data sources in the actual rendered component:
- hardcoded arrays
- mock constants
- local fake state
- fake stats
- fake chart data
- placeholder table rows
- leftover Supabase/demo logic
- helper files generating fake UI data

Remove them.

The page must use:
- real API data, or
- loading state, or
- empty state, or
- error state

But NOT fake business data.

---

### Step 3 — Backend API Mapping
For each screen, identify the required real APIs from `warehouse-service` for:
- list
- detail
- create
- update
- delete

If any required API is missing:
- implement it in backend
- follow existing backend architecture:
  - controller
  - service
  - repository
  - dto
  - response format

---

### Step 4 — Real Integration
Wire the actual rendered frontend screen to real APIs:
- on page load
- on search/filter
- on view/detail action
- on create form submit
- on edit form submit
- on delete action

---

### Step 5 — Browser-Verifiable Completion
A screen is only considered DONE if:
- real network request is triggered in browser
- displayed data comes from backend response
- create/update/delete/detail actions also trigger real backend calls
- fake data is gone from visible UI

---

## REQUIRED SCREENS

At minimum, review and complete these visible admin screens:

- Dashboard
- Đơn hàng
- Loại Container
- Loại Hàng
- Hãng Tàu
- Lịch Trình
- Cước Phí
- Quản trị hệ thống
- Tài khoản Admin

Also review:
- modals
- forms
- detail popups/pages
- tables and action buttons opened from those screens

---

## REQUIRED FUNCTIONAL COVERAGE

For each applicable screen:

### LIST
- load real backend data
- support search/filter/pagination if UI has those controls

### DETAIL / XEM
- “Xem” must show real backend detail
- detail must not use fake data

### CREATE / THÊM
- add form must submit to backend
- saved data must persist and refresh UI

### UPDATE / SỬA
- edit must load current backend data
- save must update backend and refresh UI

### DELETE / XÓA
- delete must call backend
- UI must refresh after delete

If a module should not hard-delete by business rule:
- clearly state it
- use the correct deactivate/status/soft-delete behavior instead

---

## AUTH / TOKEN RULE

While integrating APIs:
- all protected API calls must send token
- login/logout flow must continue to work
- user must still need token to access internal pages
- role-based access must remain correct

---

## OUTPUT FORMAT

# 1. Real Route / Component Mapping

For each screen:
- Route:
- Actual rendered component:
- Parent/wrapper component:
- Fake data source found in:
- Duplicate/dead similar files (if any):

---

# 2. Fake Data Removal Result

For each screen:
- hardcoded rows removed: yes/no
- fake cards/stats removed: yes/no
- fake charts removed: yes/no
- Supabase/demo leftovers removed: yes/no

---

# 3. Backend API Coverage

For each screen/module:
- LIST API:
- DETAIL API:
- CREATE API:
- UPDATE API:
- DELETE API:
- missing APIs added:

---

# 4. Frontend Integration Result

For each screen:
- LIST ✅/❌
- DETAIL ✅/❌
- CREATE ✅/❌
- UPDATE ✅/❌
- DELETE ✅/❌
- real network request visible in browser ✅/❌
- visible fake data fully removed ✅/❌

---

# 5. Changed Files

## Backend
- ...

## Frontend
- ...

---

# 6. Final Verification

For each screen, explicitly confirm:
- page no longer uses fake data
- page now sends real API requests
- page UI reflects backend response
- required CRUD actions work

Do NOT claim completion unless this is true.

---

## IMPORTANT IMPLEMENTATION RULES

### Backend
- keep controller thin
- business logic in service
- repository only for persistence
- use DTOs properly
- keep package structure and naming consistent

### Frontend
- keep current UI and layout
- do not redesign pages
- only replace fake data and wire real actions
- handle loading/error/empty states properly
- keep role-based behavior intact

---

## VERY IMPORTANT

Do NOT stop after wiring only dashboard or only list APIs.

You must continue until the actual visible screens use:
- real list data
- real detail data
- real create
- real update
- real delete

If previous edits were made in the wrong files, fix the actual routed components instead.