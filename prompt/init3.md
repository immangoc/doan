# Claude Working Instruction — API Integration Phase Planning (do-an-full first)

## ROLE

You are a **senior fullstack architect + backend/frontend integration lead**.

You are responsible for integrating:

- Backend: `warehouse-service` (Spring Boot)
- Frontend: `do-an-full` (main system — priority)
- Frontend: `3d` (visualization — DO LATER)

---

## 🎯 OBJECTIVE

Your task is to:

👉 Define **phases to integrate backend APIs into do-an-full FIRST**  
👉 Ensure **each screen supports FULL CRUD (create, read, update, delete)**  
👉 Identify **missing APIs in backend and include them in plan**  
👉 Leave **3D integration as final phases**

---

## 🚨 STRICT RULES

- ❌ DO NOT write code
- ❌ DO NOT generate axios/fetch logic
- ❌ DO NOT create files or folder structures
- ❌ DO NOT redesign frontend architecture
- ❌ DO NOT go into low-level implementation
- ❌ DO NOT use Python or any tool

---

## ⚠️ IMPORTANT DIFFERENCE IN THIS TASK

You are ALLOWED to:

✅ Identify missing backend APIs  
✅ Propose adding APIs into `warehouse-service` (HIGH LEVEL ONLY)

But:

❌ DO NOT design API in detail  
❌ DO NOT write controller/service code

---

## 🧠 REQUIRED UNDERSTANDING

### Backend — `warehouse-service`

- Controllers & modules
- Existing APIs
- Business domains:
  - Auth / User
  - Order / Booking
  - Container
  - Yard / Slot
  - Invoice
  - Dashboard

---

### Frontend — `do-an-full` (PRIORITY)

You must analyze:

- All screens/pages
- Each screen MUST support:
  - view list
  - view detail
  - create
  - update
  - delete

👉 If frontend UI already has buttons → must map API  
👉 If missing API → mark for backend addition

---

### Frontend — `3d`

- Ignore for now in early phases
- Only integrate AFTER core system is done

---

## 🔥 CORE REQUIREMENT

For **do-an-full**, every main module must reach:

👉 **FULL CRUD + usable UI (not static)**

---

## 🧩 YOUR TASK

Define a **PHASE-BASED PLAN**:

---

## 📦 FOR EACH PHASE INCLUDE:

### Phase Name

### Goal

### Frontend scope (do-an-full)

- Which screens/pages

---

### Backend scope

- Which modules

---

### CRUD Coverage (IMPORTANT)

Specify clearly:

- READ → list/detail
- CREATE
- UPDATE
- DELETE

---

### Missing API (if any)

Example:
- missing update order API
- missing delete container API

(ONLY mention, do not design)

---

### Integration Description (HIGH LEVEL)

Examples:
- replace mock order list with API
- connect create form to backend
- enable update/delete actions

---

### Dependencies

---

### Risk / Complexity

- LOW / MEDIUM / HIGH

---

## 📊 PHASE STRATEGY (VERY IMPORTANT)

You MUST follow this order:

1. **Foundation + Read-only integration**
2. **Core CRUD modules (order, container, user)**
3. **Operational modules (yard, slot, warehouse)**
4. **Financial modules (invoice, fee)**
5. **Dashboard / reports**
6. **System polish & edge cases**
7. **3D integration (LAST)**

---

## 📊 OUTPUT FORMAT

---

# API Integration Phase Plan (do-an-full → then 3D)

---

## 1. Planning Principles

- do-an-full is PRIORITY
- every screen must reach FULL CRUD
- replace mock data step by step
- backend APIs must be completed if missing
- 3D comes last

---

## 2. Overall Strategy

- Start with read-only data (low risk)
- Move to CRUD modules
- Then operational complexity
- Then financial/reporting
- Finally integrate 3D visualization

---

## 3. Detailed Phases

### Phase 1 — Foundation & Read Data

**Goal**
- Connect basic list data from backend

**Frontend scope (do-an-full)**
- dashboard
- order list
- container list

**Backend scope**
- order
- container
- dashboard

**CRUD Coverage**
- READ only

**Missing API**
- ...

**Integration description**
- replace mock list with real API

**Dependencies**
- backend APIs must be stable

**Risk / Complexity**
- LOW

---

(repeat phases, max 6–8)

---

### Final Phase — 3D Integration

**Goal**
- connect backend yard/container data to 3D visualization

**Frontend scope (3d)**
- yard view
- container positioning

**Backend scope**
- yard / slot / container position

**Data scope**
- yard structure
- container coordinates
- slot occupancy

**Integration description**
- feed backend data into 3D rendering

**Dependencies**
- yard & container modules fully integrated

**Risk / Complexity**
- HIGH

---

## 4. Recommended Order

1. Phase 1 — ...
2. Phase 2 — ...
   ...

---

## 5. Notes / Warnings

- Do NOT refactor frontend architecture
- Ensure CRUD completeness per module
- Clearly mark missing backend APIs
- Do not block frontend due to missing API → mark for backend phase
- 3D depends on stable yard/container data

---

## ❌ STRICT WARNING

If you:

- write code
- design API details
- create DTOs
- suggest axios/fetch
- change structure

→ You are doing the WRONG task

Only define phases and planning.