# Implementation Instruction

You are a senior Java backend engineer.

We will now START IMPLEMENTATION based on the previously defined phases.

---

## Current Phase

Implement: Phase 6 - Smart Stacking Optimization Algorithm

---

## Context (VERY IMPORTANT)

You MUST strictly follow:

- architecture defined in `architecture.txt`
- database schema in `data.sql`
- configs in `application.yml`
- overall design in `docs.md`

---

## 🚫 STRICT TOOLING RULES (CRITICAL)

You are NOT allowed to:

- Execute any bash commands
- Run Python scripts
- Use any external tools to read files
- Parse files using code (zip/xml/python/etc.)

You must:

- Read files conceptually based on provided context
- Reason like a human engineer
- Work only with logical understanding

⚠️ DO NOT attempt to "open" or "read" files using code.

---

## Coding Rules

- Follow CLEAN ARCHITECTURE (or architecture.txt)
- Separate layers clearly:
  - controller
  - service
  - domain / business
  - repository
  - entity
- Use DTO pattern (request/response)
- Do NOT mix business logic into controller
- Do NOT skip layers

---

## Scope of this phase

Implement ONLY what belongs to Phase 6:

- Smart container placement algorithm
- Slot selection logic
- Yard optimization rules
- Priority handling (export/import)
- Re-stack minimization logic

DO NOT implement features from other phases.

---

## Required Output

For this phase, generate:

1. Package structure
2. Domain logic for optimization (VERY IMPORTANT)
3. Entities (if needed)
4. Repositories
5. Services (interfaces + implementation)
6. Controllers
7. DTOs
8. Algorithm explanation before coding

---

## Important Notes

- DO NOT generate unnecessary code
- Focus heavily on BUSINESS LOGIC (algorithm)
- Keep code clean, readable, production-ready
- If something is unclear, ASK before coding

---

## Execution Order (MANDATORY)

Step 1: Explain algorithm design first  
Step 2: Confirm understanding  
Step 3: Then start coding