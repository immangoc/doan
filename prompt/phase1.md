# Claude Working Instruction — Full Cleanup, Full Review, Full CRUD Completion

## ROLE

You are a **senior fullstack architect + senior Spring Boot engineer + senior frontend integration engineer + code reviewer**.

Projects:

- Backend: `warehouse-service`
- Frontend: `do-an-full`

Your task is to **review, clean up, fix, and complete the system** so that backend and frontend are aligned and all major pages are usable with proper CRUD behavior.

---

## IMPORTANT CONTEXT

There is currently a newly added backend class similar to:

- `DemoDataSeeder`

This class is used to auto-seed demo users/accounts at startup.

### BUT THIS IS NOT NEEDED.

Because the project already has **initial user initialization / init user logic from the beginning**, this new demo seeding logic is redundant and must be removed if it overlaps or conflicts.

Also, the frontend login page currently shows **predefined demo accounts** (Admin / Planner / Operator / Customer).  
This must be removed.

The login page should become a **normal login page only**, without showing any built-in demo accounts.

---

## PRIMARY GOALS

You must do ALL of the following:

### 1. Remove redundant demo seeding logic
- Find and review any newly added demo seeding class such as `DemoDataSeeder`
- If it is redundant with existing init user / admin initialization logic:
  - remove it safely
  - remove any related references/usages if needed
- Ensure startup behavior remains correct
- Do not break existing auth flow

---

### 2. Review the entire backend (`warehouse-service`)
You must review backend carefully:

- architecture consistency
- module consistency
- DTO / entity / repository alignment
- controller/service/repository flow
- DB coverage vs code
- missing APIs needed by frontend
- incorrect APIs
- duplicate logic
- dead code
- redundant seed/init code
- auth / role / permission flow
- CRUD completeness

If something is missing or wrong, fix it.

---

### 3. Review the entire frontend (`do-an-full`)
You must review frontend carefully:

- all pages/screens
- all modules
- current API integration
- remaining mock/static data
- incomplete CRUD flows
- broken actions
- missing forms
- missing detail views
- inconsistent UI behavior
- pages that only display data but cannot create/update/delete
- pages that still show demo-only content

If something is missing or wrong, fix it.

---

### 4. Ensure FULL CRUD + DETAIL COVERAGE for each major page
For each main page/module in `do-an-full`, check whether it has:

- list / overview
- detail / view
- create
- update / edit
- delete

If a page is intended to be manageable by user/admin/operator, it should support the appropriate actions.

### Expected minimum behavior:
- **View/List**: must work
- **Detail/Xem**: must work
- **Create/Thêm**: must work where business-appropriate
- **Update/Sửa**: must work where business-appropriate
- **Delete/Xóa**: must work where business-appropriate

If backend API is missing:
- add/fix it in `warehouse-service`
- then wire it into frontend

---

### 5. Remove demo-account UI from login page
The login page must be simplified:

- remove predefined account cards
- remove demo email suggestions
- remove visible demo password text
- keep only a standard login form
- preserve normal login functionality

No demo-account shortcuts should remain on the login screen.

---

### 6. Review authentication token flow and role-based authorization
You must verify and fix the full login/auth flow:

#### Backend
- verify login returns a valid token
- verify token contains enough identity/role information for authorization
- verify role information is returned either:
  - inside JWT claims, or
  - through a proper authenticated user/profile response after login
- verify security config protects private APIs properly
- verify only public endpoints (such as login/register if intended) are accessible without token
- verify all internal/private endpoints require authenticated token
- verify role-based restrictions are correctly enforced on protected APIs

#### Frontend
- verify user must log in successfully to access internal pages
- verify if there is no token, the user cannot enter the system
- verify protected routes/pages redirect to login when token is missing or invalid
- verify token is stored and reused correctly for authenticated API calls
- verify logout removes token/session correctly
- verify UI/menu/page access is restricted according to role
- verify admin / planner / operator / customer only see and access what their role is allowed to access

If token flow, route guarding, or role-based access is incomplete or wrong, fix it.

---

## STRICT RULES

- Follow existing architecture of both projects
- Do not perform random refactors unrelated to the task
- Do not rewrite the whole project from scratch
- Do not change folder structure unless truly necessary
- Do not invent business logic not grounded in the codebase
- Prefer fixing incrementally and practically
- Keep UI style consistent with the current design
- Keep backend package structure consistent with `architecture.txt`
- Respect existing response format conventions

---

## BACKEND REVIEW REQUIREMENTS

You must inspect at least these areas in `warehouse-service`:

### Core files
- `architecture.txt`
- `list-function.txt`
- `docs.md`
- `pom.xml`
- `src/main/resources/application.yml`
- `src/main/resources/db/migration/data.sql`
- all Flyway migration files
- all relevant Java source files

### Review focus
- auth / login / register / profile
- JWT / token generation / token parsing / token validation
- user / role / permission
- route authorization / security config
- order / booking
- container
- yard / slot / position
- gate-in / gate-out
- fee / invoice / billing
- dashboard / reports
- alerts / notifications
- admin/master-data modules

### Specifically verify
- whether `DemoDataSeeder` should be deleted
- whether there is already existing init user logic
- whether duplicate initialization exists
- whether frontend-needed CRUD APIs exist
- whether repository methods and entity fields match schema
- whether controller → service → repository flow is clean
- whether login returns token properly
- whether token includes/derives correct role information
- whether protected APIs require authentication
- whether role-based access is actually enforced

---

## FRONTEND REVIEW REQUIREMENTS

You must inspect all important pages in `do-an-full`.

### Review focus
- login
- auth persistence
- token storage
- route guards / protected pages
- role-based menu/page visibility
- dashboard
- user/account management
- orders/booking
- container management
- yard/warehouse/slot screens
- schedule / shipping company / fee config / cargo types / container types
- reports / alerts / admin pages
- any forms, tables, modals, action buttons

### Specifically verify per page
For each page:
- Is list data real or still mock?
- Is “Xem” detail actually complete?
- Is create implemented?
- Is update implemented?
- Is delete implemented?
- Are API calls wired correctly?
- Are validation / loading / error states reasonable?
- Is page behavior aligned with backend?
- Does the page require token before access?
- Is the page visible only for the correct role?

If missing, implement/fix it.

---

## HOW TO EXECUTE THE TASK

Perform the work in this order:

### Step 1 — Cleanup redundant backend seed/init code
- Find duplicate demo seeding logic
- Remove `DemoDataSeeder` if redundant
- Keep only the proper original init-user logic

### Step 2 — Full backend auth/security review
- Review login flow
- Review JWT/token generation and validation
- Review protected endpoints
- Review role-based authorization
- Fix token/role/security issues first

### Step 3 — Full backend functional review
- Review modules and APIs
- Identify missing/incomplete CRUD endpoints
- Fix/add them where needed

### Step 4 — Full frontend auth/access review
- Review login flow
- Remove demo-only login content
- Ensure token is required to enter internal pages
- Ensure protected routes work correctly
- Ensure role-based UI visibility/access works correctly

### Step 5 — Full frontend functional review
- Review all main screens
- Remove demo-only/static remnants
- Wire/fix CRUD behavior

### Step 6 — Final verification
- Confirm each important page has proper behavior
- Confirm backend/frontend alignment
- Confirm no redundant demo seeding remains
- Confirm token/role authorization is working end-to-end

---

## OUTPUT FORMAT

You must work and report in this structure:

# 1. Cleanup Result
- Was `DemoDataSeeder` removed?
- What was redundant?
- What original init logic remains?

# 2. Auth & Security Review Summary
Mark:
- Login API
- Token generation
- Token validation
- Protected routes
- Role-based authorization
- Frontend route guard
- Role-based menu/page visibility

For each, use:
- DONE
- PARTIAL
- MISSING
- FIXED

Also mention:
- what token/role issues were found
- what was fixed
- whether login is now mandatory to enter internal pages

# 3. Backend Review Summary
For each major backend module, mark:
- DONE
- PARTIAL
- MISSING
- FIXED

Also mention:
- APIs added
- APIs fixed
- architecture issues fixed
- DB mismatch issues fixed

# 4. Frontend Review Summary
For each major page/module, mark:
- LIST
- DETAIL
- CREATE
- UPDATE
- DELETE
- TOKEN REQUIRED
- ROLE CHECK

Example:
- Orders page: LIST ✅ DETAIL ✅ CREATE ✅ UPDATE ⚠️ DELETE ❌ TOKEN REQUIRED ✅ ROLE CHECK ✅

Then fix missing items.

# 5. Login Page Cleanup
- confirm demo accounts removed
- confirm login still works
- confirm token is required before entering internal pages

# 6. Changed Files
List all changed files clearly.

# 7. Final Verdict
Summarize:
- what is now complete
- whether token/role-based access is enforced correctly
- what still remains if anything

---

## IMPORTANT IMPLEMENTATION RULES

When fixing code:

### Backend
- use existing controller/service/repository pattern
- do not place business logic in controller
- do not bypass service layer
- use DTOs properly
- keep response style consistent

### Frontend
- do not replace the design unnecessarily
- preserve current layout/components as much as possible
- only change what is needed for correctness and completeness

---

## VERY IMPORTANT

Do not stop after only deleting `DemoDataSeeder`.

You must continue to:
- review auth/token flow
- review role-based authorization
- review route protection
- review all backend
- review all frontend
- check all major pages
- ensure proper CRUD/detail completeness
- ensure token is required to access internal pages
- ensure role-based access is enforced
- remove demo-account UI from login page
- fix whatever is incomplete

This is a **full review + cleanup + auth/security verification + completion task**.

Start by checking whether `DemoDataSeeder` is redundant compared to the original init-user logic, then verify login/token/role flow before reviewing the rest.