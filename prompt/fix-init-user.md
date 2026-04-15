# Claude Working Instruction — Replace SQL Admin Seed with Code Initialization

## Role

You are a **senior Spring Boot backend engineer** working on:

- Backend project: `warehouse-service`

---

## CURRENT PROBLEM

Currently, admin user is being initialized using SQL file:

- `V4_seed_admin_user.sql`

Problem:

- Password is hardcoded as BCrypt string
- This is unsafe and unreliable
- It may not match the actual encoder configuration
- It is not flexible for different environments

---

## OBJECTIVE

You must:

👉 Remove admin initialization from SQL  
👉 Implement admin initialization in **Spring Boot code**

---

## REQUIREMENTS

### 1. Remove SQL-based admin seed

- Do NOT use `V4_seed_admin_user.sql` for admin creation anymore
- Either:
    - delete it
    - or disable it (recommended: remove admin insert part only)

---

### 2. Implement admin initialization in code

Create a startup initializer that:

- runs when application starts
- checks if admin user exists
- if not → create admin user

---

## IMPLEMENTATION RULES

### Must follow existing architecture

- Use existing:
    - `UserRepository`
    - `RoleRepository`
    - `PasswordEncoder`
    - `User` entity
    - `Role` entity

- Do NOT create duplicate logic if service already exists

---

### Use proper Spring Boot mechanism

Use ONE of the following:

- `CommandLineRunner` (recommended)
- OR `ApplicationRunner`

---

### Password handling (VERY IMPORTANT)

- Use `PasswordEncoder.encode("admin123")`
- DO NOT hardcode BCrypt string
- Must match Spring Security config

---

### Role assignment

- Find role: `ADMIN`
- Assign role to user properly via existing relationship (user_roles table)

---

### Admin data

Use:

- username: `admin`
- password: `admin123` (encoded in code)
- fullName: `System Administrator`
- email: configurable or default
- status: active

---

### Idempotent logic (VERY IMPORTANT)

- If admin already exists → DO NOTHING
- Do not create duplicate users
- Check by username

---

## CLASS STRUCTURE

You must create something like:

- package: `config` or `initializer` (follow project structure)
- class: `AdminDataInitializer`

---

## WHAT TO IMPLEMENT

### 1. Admin initializer class

- annotated with `@Component`
- implements `CommandLineRunner`

Logic:

- check if user "admin" exists
- if not:
    - find ADMIN role
    - create user
    - encode password
    - save user
    - assign role

---

### 2. Use existing services if available

If project already has:

- `UserService`
- `RoleService`

👉 Prefer using service layer instead of repository directly

---

## OUTPUT FORMAT

### 1. Root cause
Explain briefly why SQL seed is bad for password

---

### 2. Files to change

- SQL file (what to remove)
- new initializer class

---

### 3. Code implementation

Provide:

- full initializer class
- any required changes

---

### 4. Final behavior

Explain:

- what happens on first startup
- what happens on next startup

---

## IMPORTANT RULES

- Do NOT modify unrelated code
- Do NOT break existing architecture
- Do NOT create duplicate user/role logic
- Do NOT hardcode encrypted password
- Do NOT skip role assignment

---

## STRICT WARNING

If:

- Role ADMIN does not exist
- User entity structure is unclear
- Relationship user_roles is complex

→ STOP and report instead of guessing