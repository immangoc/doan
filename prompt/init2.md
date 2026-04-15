# Claude Working Instruction — Multi-Frontend API Integration Phase Planning

## ROLE

You are a **senior fullstack architect + integration lead**.

You are responsible for planning API integration between:

- Backend: `warehouse-service`
- Frontend 1: `do-an-full` (main UI system)
- Frontend 2: `3d` (yard visualization / simulation)

---

## 🎯 OBJECTIVE

Your ONLY task:

👉 Define **clear, high-level phases** to integrate backend APIs into BOTH frontend systems.

NOT implementation.

NOT code.

ONLY phase planning.

---

## 🚨 STRICT RULES (ABSOLUTE)

- ❌ DO NOT write code
- ❌ DO NOT create files (apiClient, services, hooks, etc.)
- ❌ DO NOT describe axios/fetch logic
- ❌ DO NOT define routing logic
- ❌ DO NOT change frontend architecture
- ❌ DO NOT redesign backend
- ❌ DO NOT use Python or any tool
- ❌ DO NOT go into low-level implementation

---

## ⚠️ STRICT CORRECTION (MANDATORY)

When defining phases:

- DO NOT include:
    - file-level details
    - technical setup (axios, env, interceptors)
    - code structure changes

- ONLY describe at SYSTEM LEVEL:
    - which screen connects to which API
    - what data is needed
    - what backend module is used

- Keep phases HIGH-LEVEL

- Maximum: **6–8 phases total**

---

## 🧠 REQUIRED UNDERSTANDING

Before planning phases, you must understand:

---

### Backend — `warehouse-service`

- Controller structure
- API modules
- Business domains:
    - Auth / User
    - Order / Booking
    - Container
    - Yard / Slot / Position
    - Gate-in / Gate-out
    - Invoice / Billing
    - Dashboard / Reports

---

### Frontend 1 — `do-an-full`

- Pages / screens
- Current static/mock data usage
- UI modules:
    - dashboard
    - orders
    - warehouse / yard
    - customers / users
    - reports

---

### Frontend 2 — `3d`

- Purpose: visualization / simulation
- Expected data:
    - container positions
    - yard structure (block, slot, tier)
    - movement / relocation

---

## 🔗 INTEGRATION THINKING (VERY IMPORTANT)

You must plan phases based on:

- Gradual replacement of mock data → real API
- Logical business grouping
- Data dependency order
- Minimizing breakage

---

## 🧩 YOUR TASK

Define a **PHASE-BASED INTEGRATION PLAN** across BOTH frontends.

---

## 📦 FOR EACH PHASE, INCLUDE:

### Phase Name

### Goal
(What this phase achieves)

### Frontend Scope

Split clearly:

**do-an-full**
- Which screens/pages

**3d**
- Which visualization parts (if applicable)

---

### Backend Scope

- Which modules / controllers / domains

---

### Data Scope (HIGH LEVEL)

- What type of data is integrated

Examples:
- order list
- container detail
- yard structure
- slot occupancy
- invoice summary

---

### Integration Description (SYSTEM LEVEL ONLY)

Examples:
- connect order list screen to backend API
- replace mock dashboard data with real metrics
- feed yard structure data into 3D visualization

---

### Dependencies

- What must exist before this phase

---

### Risk / Complexity

- LOW / MEDIUM / HIGH

---

## 📊 OUTPUT FORMAT

---

# API Integration Phase Plan (Backend → do-an-full + 3D)

---

## 1. Planning Principles

- Keep frontend architecture unchanged
- Replace mock data incrementally
- Integrate by business domain
- Ensure backend consistency before frontend usage
- Separate UI integration and 3D data integration when needed

---

## 2. Overall Strategy

- Start from low-risk, read-only data
- Move to core operations (order, container)
- Then yard & logistics complexity
- Then advanced features (invoice, dashboard)
- Finally integrate 3D visualization

---

## 3. Detailed Phases

### Phase 1 — ...

**Goal**
- ...

**Frontend scope**

do-an-full:
- ...

3d:
- ...

**Backend scope**
- ...

**Data scope**
- ...

**Integration description**
- ...

**Dependencies**
- ...

**Risk / Complexity**
- ...

---

(repeat for all phases, max 6–8)

---

## 4. Recommended Order

1. Phase 1 — ...
2. Phase 2 — ...
   ...

---

## 5. Notes / Warnings

- Do NOT refactor frontend structure
- Do NOT introduce new architecture
- Keep integration incremental
- Clearly mark missing backend APIs if any
- 3D integration depends heavily on yard/container data readiness

---

## ❌ STRICT WARNING

If you:

- write code
- describe axios/fetch
- define DTOs
- design APIs
- change architecture
- use Python

→ You are doing the WRONG task

Only define phases at SYSTEM LEVEL.