# Claude Working Instruction — Analyze 3D Source Code and Plan API Integration Phases

## ROLE

You are a **senior fullstack architect + senior frontend/backend integration engineer**.

You are working with 2 related projects:

- Frontend visualization project: `3d`
- Backend API project: `warehouse-service`

Your task in this step is **NOT to code**.

Your job is to:
- read the source code of both projects
- understand how the 3D app currently works
- understand what APIs/data already exist in `warehouse-service`
- map 3D screens/components to backend data
- divide the API integration work into clear implementation phases

---

## STRICT RULES

At this stage:

- ❌ DO NOT write code
- ❌ DO NOT modify files
- ❌ DO NOT refactor
- ❌ DO NOT invent fake APIs immediately
- ❌ DO NOT redesign the 3D UI
- ❌ DO NOT use assumptions when the source code can answer it

You must ONLY:
- read
- analyze
- map
- phase-plan

---

## OBJECTIVE

I want you to analyze the `3d` project source code and determine:

1. what screens/modules/components it has
2. what data each part needs
3. which APIs/data from `warehouse-service` can serve those needs
4. what backend APIs are still missing
5. how to divide the 3D ↔ backend integration into **clear phases**

---

## REQUIRED READING — PROJECT `3d`

You must inspect the real source code of the `3d` project, including at minimum:

- app entry
- route structure
- layouts
- pages/screens
- components
- data/model files
- static/mock data files
- config/constants
- 3D rendering logic
- state management if any
- utility files related to yard/container mapping
- any fake data used for:
    - kho bãi
    - block
    - slot
    - tầng
    - container positions
    - occupancy
    - nhập kho/xuất kho
    - sự cố
    - dashboard cards
    - search/filter

### Pay special attention to screens such as:
- Tổng quan
- Điều độ bãi & Tối ưu hóa
- Sơ đồ 3D trực quan
- Sơ đồ mặt phẳng
- Quản lý hạ bãi
- Quản lý xuất bãi
- Quản lý Kho & Container
- Kiểm soát & Sự cố

If actual screen names differ in code, use the real names from source.

---

## REQUIRED READING — PROJECT `warehouse-service`

You must inspect the relevant backend source code and docs in `warehouse-service`, including:

### Core docs/config/schema
- `architecture.txt`
- `list-function.txt`
- `docs.md`
- `pom.xml`
- `src/main/resources/application.yml`
- `src/main/resources/db/migration/data.sql`
- all relevant Flyway migration files

### Relevant Java source
Focus on backend modules related to 3D needs:
- yard
- zone
- block
- slot
- container
- container position
- relocation
- gate-in
- gate-out
- order/booking
- dashboard/statistics
- alerts/incidents
- warehouse occupancy / storage
- any APIs already built for visualization or map data

You must verify actual controller/service/repository code, not just docs.

---

## ANALYSIS GOAL

You must figure out:

### 1. What the 3D app currently uses
For each important screen/component in `3d`, identify:
- what UI it renders
- what fake/static/mock data it currently depends on
- what user actions exist
- what data shape it expects

### 2. What backend already supports
For each 3D need, identify:
- existing backend endpoint/module
- whether data is sufficient
- whether response shape is usable directly
- whether backend logic is missing/partial

### 3. What still needs to be added
Clearly distinguish:
- ✅ already supported by backend
- ⚠️ partially supported
- ❌ missing

---

## IMPORTANT THINKING RULE

You must plan integration based on **real 3D data needs**, such as:

- yard overview cards
- occupancy percentages by warehouse type
- zone/block/slot tree
- 3D container coordinates / positions
- plane map data
- search container by code/location
- nhập kho / xuất kho lists
- container waiting to nhập bãi
- relocation / optimization suggestion data
- incidents / alerts in yard
- summary counters by area/type/status

Use the existing fake data structures in `3d` as the reference for what the API should eventually provide.

---

## PHASE PLANNING REQUIREMENT

After analyzing, divide the integration into logical phases.

### IMPORTANT:
- Keep phases high-level
- Do NOT write implementation detail like axios files/hooks
- Do NOT go into component-level code yet
- Maximum **8 phases**
- Prefer real delivery order:
    - low-risk / read-only first
    - then structural/visualization data
    - then operation flows
    - then optimization/incidents

---

## FOR EACH PHASE, YOU MUST INCLUDE

### Phase Name

### Goal
What this phase achieves

### 3D Scope
Which screens/modules/components in `3d` are included

### Backend Scope
Which modules/controllers/APIs in `warehouse-service` are involved

### Data Scope
What data this phase integrates, for example:
- warehouse overview stats
- yard structure
- container positions
- slot occupancy
- gate-in waiting list
- relocation suggestions
- incidents/alerts

### Existing Backend Coverage
- already available
- partial
- missing

### Missing Backend Work
Mention only at high level:
- which APIs/data need to be added or extended

### Dependencies
What previous phase must be done first

### Risk / Complexity
- LOW
- MEDIUM
- HIGH

---

## OUTPUT FORMAT

Return the result in clean markdown:

# 1. 3D Project Structure Overview

Summarize:
- main screens/pages
- major components
- where fake/static data is used
- what the 3D app appears to do overall

---

# 2. 3D Data Need Mapping

For each important screen/module in `3d`, provide:

## [Screen/Module Name]
- Purpose:
- Current data source: fake/static/mock/partial
- Data needed:
- Matching backend module/API:
- Coverage: DONE / PARTIAL / MISSING

---

# 3. Backend Coverage Summary

Group by backend domain:

- Yard / Zone / Block / Slot
- Container / Position
- Gate-in / Gate-out
- Orders / Booking
- Dashboard / Stats
- Alerts / Incidents
- Optimization / Relocation

For each group, mark:
- DONE
- PARTIAL
- MISSING

---

# 4. API Integration Phases for `3d`

### Phase 1 — ...
- Goal:
- 3D Scope:
- Backend Scope:
- Data Scope:
- Existing Backend Coverage:
- Missing Backend Work:
- Dependencies:
- Risk / Complexity:

(repeat for all phases)

---

# 5. Recommended Implementation Order

List the phases in the order they should be implemented and explain briefly why.

---

# 6. Important Notes / Warnings

Mention things like:
- where the 3D app depends heavily on fake data
- where backend response shape may need adapter logic later
- which screens are most risky/complex
- which phase should not start until previous data is stable

---

## FINAL WARNING

Do NOT code yet.

Do NOT modify files.

Do NOT jump into implementation.

Your job now is only to:
- read source code carefully
- analyze real data needs
- map to backend
- divide into proper integration phases