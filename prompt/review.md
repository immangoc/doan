# Claude Working Instruction — Review and Fix Auth Flow in Frontend

## Role

You are a **senior frontend/fullstack developer** reviewing and fixing authentication logic in:

- Frontend: `do-an-demo-2`
- Backend: `warehouse-service`

---

## PROJECT CONTEXT

- `warehouse-service` backend is already completed and must be treated as **source of truth**
- You are **not allowed to modify backend**
- Your task is to **review, debug, and fix frontend code only** in `do-an-demo-2`
- Frontend currently has authentication/login issues and role handling issues
- You must preserve the current frontend architecture as much as possible
- You must not redesign UI or change page layout unnecessarily

---

## CURRENT PROBLEMS TO FIX

You must focus on these issues first:

### 1. Login flow issue
Current problem:
- when login succeeds or fails, the page reloads and stays on the login page
- successful login does not navigate correctly into the main app
- failed login does not show correct behavior

You must find the real cause and fix it.

---

### 2. Token handling issue
Current requirement:
- after login succeeds, store token correctly
- use token correctly for authenticated API calls
- avoid broken state after page refresh

---

### 3. Role-based authorization
Current requirement:
- extract/decode JWT token on frontend
- read role information from token
- use role in frontend authorization logic
- restrict/allow routes or UI sections based on role from token

Important:
- do not invent role names
- use the real role structure found in the token or backend auth response
- if token structure is unclear, inspect the actual login response handling code and token usage before changing logic

---

## ABSOLUTE RULES

### Backend rules
- Do NOT modify `warehouse-service`
- Do NOT change backend APIs
- Do NOT change backend DTOs
- Do NOT change backend business logic
- Frontend must adapt to backend as-is

### Frontend rules
- Only modify `do-an-demo-2`
- Do NOT redesign login page
- Do NOT change layout structure unless required for bug fixing
- Do NOT refactor unrelated modules
- Do NOT add unrelated features
- Keep fixes focused on auth, token, role, redirect, and route protection

---

## REQUIRED REVIEW WORKFLOW

### 1. Read and inspect all relevant frontend files first

You must review all files related to auth flow, including:

- login page/component
- routing config
- protected route / auth guard logic
- token storage logic
- API client / interceptor logic
- state management related to auth
- layout/main app entry
- logout logic
- any user/profile loading logic
- any role/permission logic already present

Also read the related backend auth contract only as reference:
- login API request DTO
- login API response DTO
- auth-related response shape if needed

Do not review the whole repository if not necessary.
Focus on auth-related files first.

---

### 2. Diagnose root cause before fixing

Before writing code, determine clearly:

- why login reloads instead of navigating
- whether form submit is causing browser reload
- whether login handler prevents default submit behavior correctly
- whether token is stored successfully
- whether redirect logic is wrong
- whether auth guard immediately sends user back to login
- whether token parsing fails
- whether current user/role state is lost after refresh
- whether interceptor or initialization order is broken

Do not guess.
Find the actual root cause in code.

---

### 3. Fix auth flow completely

You must fix:

#### Login behavior
- successful login should:
    - call backend login API correctly
    - store token correctly
    - decode token if needed
    - extract role
    - update auth state
    - navigate to the correct page after login

- failed login should:
    - not reload page
    - not navigate
    - show proper error handling in current UI style

#### Auth persistence
- when page refreshes:
    - existing token should be restored from storage
    - auth state should be rebuilt correctly
    - user should remain logged in if token is still valid

#### Logout behavior
- clear token
- clear auth state
- redirect to login safely

---

### 4. Implement role-based authorization

You must implement frontend role handling based on token content.

Requirements:

- decode JWT safely on frontend
- extract role / authorities / permissions from the real token structure
- normalize the role shape only if necessary
- use role for route or screen access control
- preserve current UI layout

If multiple roles exist:
- support them cleanly
- do not hardcode one fixed role unless backend token really only contains one

If the token contains:
- `role`
- `roles`
- `authorities`
- or nested claims

Then adapt to the actual structure found in code/token usage.

---

### 5. Validate the result before finishing

Verify:

- login success no longer reloads incorrectly
- login failure no longer reloads incorrectly
- token is stored correctly
- auth state survives refresh
- route protection works
- role is extracted from token
- role-based access logic works
- no backend code was modified
- no unrelated frontend screen was changed

---

## IMPLEMENTATION PRIORITY

Fix in this order:

1. login submit/reload bug
2. token storage and restore
3. redirect after login
4. auth guard / protected route logic
5. role extraction from token
6. role-based authorization logic
7. logout cleanup

---

## OUTPUT FORMAT

Return your work in this order:

### 1. Review findings
Briefly explain:
- which files are involved
- root cause of the reload/login issue
- root cause of token/redirect/role issues

### 2. Fix plan
List:
- files to update
- what each change will fix

### 3. Code changes
Provide the actual code changes for frontend only.

### 4. Final verification summary
Always include:
- login flow fixed or not
- token handling fixed or not
- role extraction implemented or not
- protected route behavior fixed or not
- files created
- files updated
- blockers if any

---

## BLOCKER RULE

If any of these happen, stop and report clearly:

- backend login response shape is inconsistent with frontend usage
- token is not JWT or cannot be decoded safely
- role is not present in token and also not present in auth response
- current frontend architecture prevents safe fix without broader refactor

If blocked, report:
- exact file
- exact API/response mismatch
- safest next action

---

## IMPORTANT WARNING

- Do NOT modify backend
- Do NOT redesign UI
- Do NOT change unrelated modules
- Do NOT only patch symptoms

You must identify the real root cause and apply a proper fix in `do-an-demo-2` only.