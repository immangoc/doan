# Claude Working Instruction — Remove DemoDataSeeder Only

## ROLE

You are a **senior Spring Boot backend engineer**.

Project: `warehouse-service`

---

## 🎯 OBJECTIVE

Fix ONLY the following issue:

👉 Remove redundant demo seeding logic  
👉 Keep existing admin initialization logic (`AdminDataInitializer`)

---

## 🚨 STRICT SCOPE (VERY IMPORTANT)

You are ONLY allowed to work on:

- `DemoDataSeeder`
- related references (if any)

❌ DO NOT:
- modify other modules
- refactor code
- change API
- change business logic
- touch frontend
- touch security
- touch database
- review entire system

👉 This is a **targeted cleanup task only**

---

## 📌 CONTEXT

There are currently TWO initialization mechanisms:

1. `AdminDataInitializer` ✅ (CORRECT — must KEEP)
2. `DemoDataSeeder` ❌ (REDUNDANT — must REMOVE)

`DemoDataSeeder`:
- creates demo users (admin, planner, operator, customer)
- duplicates responsibility of initial user setup
- is NOT needed

---

## 🧩 YOUR TASK

### Step 1 — Delete DemoDataSeeder

- Completely remove file:
    - `DemoDataSeeder.java`

---

### Step 2 — Remove related references (if any)

Check and clean:

- any `@Component` scan conflicts
- any config/import referencing DemoDataSeeder
- any duplicated role/user seeding logic

---

### Step 3 — Verify AdminDataInitializer

Ensure:

- `AdminDataInitializer` still works correctly
- it:
    - checks if admin exists
    - only creates admin if missing
- no duplicate user creation happens

---

### Step 4 — Verify application startup

Ensure:

- app still starts normally
- no bean conflict
- no duplicate data insert
- no crash on startup

---

## 📌 OUTPUT FORMAT

### 1. Removed Files
- DemoDataSeeder.java

### 2. Cleaned References
- (if any)

### 3. AdminDataInitializer Check
- OK / FIXED (with explanation)

### 4. Startup Verification
- SUCCESS / ISSUE (with explanation)

---

## ❌ STRICT WARNING

If you:

- modify other modules
- refactor unrelated code
- change architecture
- add new features

→ You are doing the WRONG task

Only remove DemoDataSeeder and ensure AdminDataInitializer works correctly.