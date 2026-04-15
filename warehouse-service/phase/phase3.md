# Implementation Instruction

You are a senior Java backend engineer.

We will now START IMPLEMENTATION based on the previously defined phases.

---

## Current Phase

Implement: Phase 3 - Catalog & Master Data (vessels, yard structure, types)

---

## Context (VERY IMPORTANT)

You MUST strictly follow:

- architecture defined in `architecture.txt`
- database schema in `data.sql`
- configs in `application.yml`
- overall design in `docs.md`

---

## Coding Rules

- Follow CLEAN ARCHITECTURE (or the architecture in architecture.txt)
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

Implement ONLY what belongs to this phase:

[List features from phase]

DO NOT implement features from other phases.

---

## Required Output

For this phase, generate:

1. Package structure
2. Entities (based on data.sql)
3. Repositories
4. Services (interfaces + implementation)
5. Controllers
6. DTOs
7. Basic validation

---

## Important Notes

- Do NOT generate unnecessary code
- Keep code clean, readable, production-ready
- If something is unclear, ask before coding