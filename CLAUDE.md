# Claude System Reading Instruction (Multi-Project Context)

## ROLE

You are a **senior system architect + senior fullstack engineer**.

You are working with a **multi-project system**, not a single project.

Projects:

1. **warehouse-service** → Backend (Spring Boot, core business system)
2. **do-an-full** → Frontend (UI + API integration)
3. **3d** → Visualization / 3D yard simulation (support system)

Your long-term goal (NOT NOW) will be:
- Understand full system
- Ensure backend ↔ frontend ↔ 3D consistency
- Support integration and feature completion

---

## 🚨 CRITICAL RULE (DEFAULT)

Default mode (when the user does not explicitly ask for implementation):

- ✅ READ → UNDERSTAND → SUMMARIZE only
- ❌ DO NOT write/modify code
- ❌ DO NOT propose implementation
- ❌ DO NOT redesign system
- ❌ DO NOT call external APIs or assume outside the codebase

Implementation mode (ONLY when the user explicitly requests to fix/build/implement, e.g. "fix code", "tạo API"):

- ✅ You MAY read files using available tools
- ✅ You MAY modify code across projects (backend/frontend/3d) to ensure consistency
- ✅ You MAY run builds/lints/tests locally to verify changes
- ✅ You MAY add missing backend APIs when required for frontend/3d integration
- ✅ Keep changes minimal, consistent with existing architecture and conventions

---

## 🧠 SYSTEM CONTEXT

This is a **Warehouse / Port / Container Yard Management System**

Core lifecycle:

1. Order / Booking
2. Container registration
3. Gate-in
4. Yard slot assignment
5. Storage tracking
6. Optimization / relocation
7. Gate-out
8. Invoice
9. Dashboard / reporting

This is NOT e-commerce → it is **logistics + port operation system**

---

## 📂 REQUIRED READING — BACKEND (MANDATORY)

You MUST read ALL of the following inside **warehouse-service**:

### Core Docs
1. `architecture.txt`
    - Module structure
    - Layering rules

2. `list-function.txt`
    - Full feature list
    - Business coverage

3. `docs.md`
    - Business flows
    - Algorithms (stacking, relocation, etc.)

---

### Configuration & Tech
4. `pom.xml`
    - Dependencies
    - Framework stack

5. `src/main/resources/application.yml`
    - Base path (`/api/v1`)
    - DB / Redis / Kafka config

---

### Database (VERY IMPORTANT)
6. `src/main/resources/db/migration/data.sql`
    - FULL schema (source of truth)

7. All files in:
   `src/main/resources/db/migration/*.sql`
    - Flyway migrations

---

### Source Code (Selective but important)

Focus on:

- `controller` → API endpoints
- `service` → business logic
- `repository` → DB access
- `entity` → DB mapping
- `dto` → request/response

---

## 📂 REQUIRED READING — FRONTEND (do-an-full)

You MUST:

- Understand project structure
- Identify:
    - API calling layer (axios / fetch)
    - Pages / modules
    - Where backend APIs will be consumed

DO NOT implement anything.

---

## 📂 REQUIRED READING — 3D PROJECT (3d)

You MUST:

- Understand purpose:
    - Visualization?
    - Yard simulation?
- Identify:
    - Data input expected
    - Relation to backend (container / slot / yard)

---

## 🔍 EXTRA FOCUS (VERY IMPORTANT)

While reading, focus on:

### Backend
- API prefix: `/api/v1`
- Controller grouping (modules)
- DTO structure (request/response)
- Business modules:
    - auth / user / role
    - container
    - yard / slot / block
    - order / booking
    - gate-in / gate-out
    - invoice
    - dashboard

### Database
- Core tables:
    - container
    - yard_position / slot
    - order / booking
    - storage
    - invoice

### System Consistency
- How backend → frontend → 3d may connect

---

## 🧾 YOUR TASK (AFTER READING)

Return ONLY the following:

---

### 1. ✅ Confirmation

- Confirm ALL required files have been read
- Mention if any file is missing or unreadable

---

### 2. 🧩 System Overview (VERY SHORT)

- What this entire system does (2–3 sentences)

---

### 3. 🏗 Backend Modules (IMPORTANT)

List main backend domains (based on controllers), for example:

- Auth / User / RBAC
- Container
- Yard / Slot
- Order / Booking
- Gate Operations
- Invoice / Billing
- Dashboard / Report
- etc.

(NO explanation, just names)

---

### 4. 🖥 Frontend Structure (SHORT)

- Main modules/pages
- Where API is likely consumed

---

### 5. 🎮 3D Project Role (SHORT)

- What it does
- How it relates to backend (guess based on code only, not assumption)

---

## ⚠️ OUTPUT RULE

- Keep response SHORT and structured
- No deep explanation
- No redesign
- No suggestion
- No implementation

---

## ❌ STRICT WARNING

If you:
- write code
- suggest solution
- design API
- propose architecture changes
- use Python

→ You are doing the WRONG task.

Only read → understand → summarize at high level.