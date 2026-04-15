# Claude Working Instruction — Real API Integration for Reports & Statistics Screen

## ROLE

You are a **senior fullstack engineer** working on:

- Backend: `warehouse-service`
- Frontend: `do-an-full`

Your task is to fix ONLY the screen:

- **Báo cáo & Thống kê**

This screen already exists in frontend and contains multiple sub-tabs/pages, but it is still using fake/static data.

---

## CURRENT PROBLEM

The main system screens have already been integrated with real backend APIs.

However, the **Báo cáo & Thống kê** screen is still using fake data.

Observed state:
- the report page has multiple sub-tabs
- visible cards/tables/charts still use hardcoded/mock values
- browser network does not show real report API requests for these tabs
- backend may or may not already have enough aggregate/report APIs

This must be fixed properly.

---

## OBJECTIVE

You must do ALL of the following for the **Báo cáo & Thống kê** screen and all of its sub-tabs:

1. Find the actual routed component(s) being rendered
2. Identify all fake/static/mock report data currently used
3. Check whether backend already has real aggregate/report APIs for each sub-tab
4. If backend is missing any required report API:
    - implement it in `warehouse-service`
    - use real database aggregation/query logic
    - design the response shape based on the fake frontend data structure already shown in the UI
5. Integrate the real APIs into the actual frontend report tabs
6. Remove fake data completely
7. Ensure the browser actually sends report API requests when each tab is opened

---

## STRICT SCOPE

You must work ONLY on:

- the **Báo cáo & Thống kê** screen
- all sub-tabs inside that screen
- related backend report/dashboard/statistics APIs required by that screen

❌ DO NOT review unrelated pages  
❌ DO NOT refactor the entire project  
❌ DO NOT change unrelated modules  
❌ DO NOT redesign UI

---

## IMPORTANT IMPLEMENTATION STRATEGY

The frontend fake data in the report screen is your reference.

You must use the existing fake data structure in each tab to infer:

- what metrics/cards are needed
- what chart series are needed
- what table columns are needed
- what backend response shape is needed

Then:

- check if backend already provides enough real aggregated data
- if not, implement missing APIs to match what the UI needs

---

## REQUIRED SUB-TABS TO REVIEW

At minimum, fully inspect all tabs under **Báo cáo & Thống kê**, including examples like:

- Tổng quan
- Tổng hợp hàng hỏng
- Tổng hợp kho lạnh
- Tổng hợp kho khô
- Tổng hợp kho dễ vỡ
- Tổng hợp kho khác

If more sub-tabs exist in code, review them too.

---

## MANDATORY EXECUTION METHOD

### Step 1 — Find actual rendered report components
For the report screen:
- identify the actual route
- identify the actual mounted parent component
- identify each child tab component/section actually rendered
- identify duplicate or dead similar files if any

You must edit the real rendered components only.

---

### Step 2 — Fake data audit
For each report tab:
- identify hardcoded cards
- identify hardcoded tables
- identify hardcoded chart series
- identify mock arrays / constants / local fake state
- identify fake summary values
- identify any leftover Supabase/demo logic

Remove them.

The UI should use:
- real API data
- or loading/empty/error state
- but NOT fake business data

---

### Step 3 — Backend API coverage check
For each report tab, check whether `warehouse-service` already has enough API/data support.

Verify:
- existing report controller/service methods
- dashboard/statistics endpoints
- aggregation queries
- DTO coverage
- whether returned data is enough for all cards/charts/tables in that tab

If not enough:
- add missing backend APIs
- or extend existing ones cleanly

---

### Step 4 — Backend implementation rules
If backend is missing report/statistics data:

You must:
- implement clean aggregate APIs in `warehouse-service`
- use existing architecture:
    - controller
    - service
    - repository
    - dto
- keep controller thin
- keep business logic in service
- use database-backed calculations, not hardcoded values
- use real data from schema/tables already present in project

Important:
- shape API responses to fit current report UI needs
- base field naming on current frontend data model if practical
- do not invent random metrics not shown in UI

---

### Step 5 — Frontend integration
For each report tab:
- connect cards to real API response
- connect charts to real API response
- connect tables to real API response
- ensure tab switching loads/updates the correct report data
- remove all fake data sources

---

### Step 6 — Browser-verifiable completion
A report tab is only DONE if:
- opening the tab triggers a real API request in browser
- cards use API data
- charts use API data
- tables use API data
- fake values are gone

---

## REQUIRED OUTPUT FORMAT

# 1. Report Screen Route / Component Mapping

- Route:
- Parent report component:
- Child tab components:
- Duplicate/dead similar files (if any):

---

# 2. Fake Data Audit

For each report tab:
- fake cards found in:
- fake chart data found in:
- fake table rows found in:
- fake constants/mock state found in:

---

# 3. Backend Coverage Review

For each report tab:

## [Tab name]
- Existing backend API:
- Existing data sufficient: YES/NO
- Missing metrics:
- Missing table data:
- Missing chart data:
- Backend changes needed:

---

# 4. Backend Changes Implemented

List all added/fixed backend items, grouped by:
- controllers
- services
- repositories
- DTOs
- queries/aggregation logic

---

# 5. Frontend Integration Result

For each report tab:

## [Tab name]
- cards use real API: YES/NO
- charts use real API: YES/NO
- tables use real API: YES/NO
- fake data removed: YES/NO
- network request visible in browser: YES/NO

---

# 6. Changed Files

## Backend
- ...

## Frontend
- ...

---

# 7. Final Verification

Explicitly confirm for the **Báo cáo & Thống kê** screen:
- all sub-tabs no longer use fake data
- all required tabs call real backend APIs
- cards/charts/tables reflect backend responses
- remaining gaps (if any) are clearly listed

---

## IMPORTANT RULES

- Do not stop after only fixing the main “Tổng quan” tab
- You must continue until all sub-tabs in the report screen are handled
- Do not claim completion unless the browser-visible report tabs actually trigger real API calls
- Use the fake frontend data structure as the contract reference when designing missing backend report APIs
- Keep UI layout intact; only replace fake data with real backend integration