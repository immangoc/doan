# Fix Review Gaps - Priority 1

You are a senior Java backend engineer.

We already completed the implementation phases.  
Now we are in FIX / HARDENING mode based on the final review.

## Important Context

You MUST follow strictly:

- architecture in `architecture.txt`
- database in `src/main/resources/db/migration/data.sql`
- configs in `src/main/resources/application.yml`
- business requirements in `list-function.txt`
- system design and business flows in `docs.md`

## Working Mode

- DO NOT reread or parse documents using Python or shell scripts
- DO NOT run Python
- DO NOT generate analysis again
- DO NOT review the whole project again
- ONLY implement the fixes requested below
- Keep package/module structure aligned with `architecture.txt`
- Do not add unnecessary features
- Do not change database tables unless explicitly required
- If a DB change is truly required, explain why first

## Current Task

Implement ONLY these 3 blocker fixes from final review:

### Fix 1 — Order approval/rejection
Add missing admin booking workflow:
- PUT `/admin/orders/{id}/approve`
- PUT `/admin/orders/{id}/reject`

Requirements:
- add service methods
- update order status correctly
- validate allowed transitions
- keep controller thin
- use DTO/request object if needed
- follow existing response style

### Fix 2 — Customer near-expiry dashboard scoping
Fix customer dashboard so that near-expiry containers only include containers belonging to that customer,
not all containers in the system.

Requirements:
- correct repository query/service logic
- preserve current response structure
- no fake data
- no broad system-wide result

### Fix 3 — Persistent invoice at gate-out
Persist gate-out billing result into database.

Requirements:
- before coding, check whether current schema already has suitable table(s)
- if schema does NOT support invoice persistence, DO NOT invent silently
- first explain the minimal DB gap and propose the smallest safe change
- if a new migration is required, keep it minimal and consistent with architecture
- implement entity/repository/service/controller integration only for this invoice persistence
- do not implement a full payment module yet unless required for this fix

## Required Output

For each fix:
1. what files will be added/updated
2. implementation
3. short summary of business behavior after fix

## Important Rules

- No Python
- No shell parsing for docs
- No full-project refactor
- No extra feature outside these 3 fixes
- Follow architecture.txt layering strictly