# Final Review Instruction

You are a senior Java backend architect and code reviewer.

I have finished implementing almost all phases of this project.

Now your task is NOT to add new features immediately.
Your task is to perform a FULL PROJECT REVIEW and GAP ANALYSIS.

---

## Required Reading

You must carefully read and compare all of these files:

1. `architecture.txt`
2. `list-function.txt`
3. `docs.md`
4. `pom.xml`
5. `src/main/resources/application.yml`
6. `src/main/resources/db/migration/data.sql`
7. all Java source code under `src/main/java`

Do not skip anything.

Important:
- Read source code directly from existing files
- Do not use python
- Do not use bash scripts for analysis if not necessary
- Do not re-read docs in a tool-heavy way
- Just inspect files normally and review the project

---

## Review Goals

Please verify whether the current codebase is:

1. Correctly following the architecture in `architecture.txt`
2. Complete enough compared to `list-function.txt`
3. Consistent with database schema in `data.sql`
4. Consistent with business flows and rules in `docs.md`
5. Reasonably complete for all implemented phases

---

## Review Scope

You must review the project in these dimensions:

### 1. Architecture Review
Check:
- package structure
- module boundaries
- layer separation
- controller/service/repository/entity/dto separation
- whether any code violates the architecture

### 2. Database Review
Check:
- whether entities match tables in `data.sql`
- whether important relationships are correctly mapped
- whether any table is missing entity/repository/service support
- whether code introduces tables/fields not in schema
- whether schema parts exist but are unused

### 3. Feature Coverage Review
Compare source code against `list-function.txt`.

For each major feature group, determine status:
- DONE
- PARTIAL
- MISSING
- INCORRECT

You must group by business domain, for example:
- Auth / User / RBAC
- Booking
- Container
- Yard Management
- Gate In / Gate Out
- Optimization
- Billing
- Alerts / Monitoring
- Dashboard / Reports
- Chat / Review / Secondary

### 4. Business Flow Review
Compare source code against `docs.md`.

Check whether main flows are implemented correctly, including:
- booking lifecycle
- gate-in flow
- slot assignment / yard placement
- gate-out flow
- billing flow
- alert flow
- optimization flow
- report/dashboard flow

Highlight:
- missing business rules
- incorrect state transitions
- missing validations
- missing transactions
- missing integration between modules

### 5. API Review
Check:
- whether APIs are logically complete
- whether important endpoints are missing
- whether API naming is consistent
- whether controller scope matches architecture and business use cases

### 6. Quality / Readiness Review
Check:
- obvious code duplication
- missing validations
- missing exception handling
- missing transactional boundaries
- missing security annotations
- risky design decisions
- unfinished stubs / TODOs / placeholders

---

## Required Output Format

Return the result in clean markdown with these sections:

# 1. Overall Assessment
- short summary of current completion level
- estimated completion percentage
- whether project is “phase-complete” or not

# 2. Architecture Compliance Review
- what is correct
- what violates architecture
- what should be refactored

# 3. Database Coverage Review
Create a table like this:

| Table | Entity | Repository | Service | Controller/API | Status | Notes |

Status can be:
- DONE
- PARTIAL
- MISSING

# 4. Feature Coverage Review
Create a table like this:

| Feature Group | Feature | Expected Source | Current Status | Notes |

Status can be:
- DONE
- PARTIAL
- MISSING
- INCORRECT

# 5. Business Flow Review
For each core flow, state:
- expected behavior
- current implementation status
- missing pieces
- risk level

# 6. Missing Items / Gaps
List all missing or incomplete items, grouped by priority:
- Critical
- High
- Medium
- Low

# 7. Final Verdict
Answer clearly:
- Is the project already complete enough?
- What exactly is still missing before calling it done?
- What should be the next fixing order?

---

## Important Rules

- Do NOT write code yet
- Do NOT auto-fix anything yet
- Do NOT invent features not present in provided files
- Base the review only on the actual code and the provided documents
- Be strict, realistic, and practical
- If something exists only partially, mark it as PARTIAL, not DONE