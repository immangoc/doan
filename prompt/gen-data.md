# Claude Instruction — Generate Test Data SQL (Safe for Existing UI)

## Role

You are a senior backend engineer working on `warehouse-service`.

Your task is to generate **SQL insert test data** for the database.

---

## OBJECTIVE

Generate SQL `INSERT` statements to create **10 records per table** for testing.

However, you must follow strict rules to avoid breaking the current UI.

---

## EXCLUDED TABLES (DO NOT TOUCH)

DO NOT insert or modify data in these tables:

- users
- roles
- user_roles
- user_profile
- user_address (or similar user-related tables)
- any authentication / security related tables

Reason:
→ These are already used by the current UI (login, header user, etc.)
→ Changing them may break the system

---

## INCLUDED TABLES

Generate test data for remaining business tables, such as (adjust based on actual schema):

- containers
- container_types
- cargo_types
- cargo_attributes
- container_statuses
- orders
- order_container
- order_status
- vessels
- manifests
- yard / zones (if exist)
- inventory / reports related tables

👉 You must first **scan the schema (entities or migration files)** and determine actual tables.

---

## STRICT REQUIREMENTS

### 1. Respect foreign keys
- Insert parent tables first
- Then child tables
- Ensure all foreign keys are valid

Example:
- container_types → containers
- cargo_types → containers
- orders → order_container

---

### 2. Data must be realistic (NOT random garbage)

#### Containers
- container_id: format like `CONT0001`
- gross_weight: realistic (1000 – 30000)
- status_id: valid FK

#### Orders
- customer_name: readable name
- email: valid format
- status_id: valid FK

#### Vessels
- vessel_name: realistic (e.g. "EVERGREEN A1")
- shipping_line: real-like (e.g. "Maersk")

#### Dates
- use reasonable timestamps (recent dates)

---

### 3. Avoid duplicate unique fields
- username (excluded anyway)
- email
- container_id
- any unique constraints

---

### 4. Use correct SQL syntax for PostgreSQL

- Use `NOW()` or timestamp values
- Use proper string quotes
- No invalid casts

---

### 5. Keep UI stable

- DO NOT delete existing data
- DO NOT truncate tables
- ONLY INSERT additional records

---

## OUTPUT FORMAT

Return:

### 1. Ordered SQL script
- grouped by table
- correct insert order (FK-safe)

Example:

```sql
-- container_types
INSERT INTO container_types (...) VALUES (...);

-- cargo_types
INSERT INTO cargo_types (...) VALUES (...);

-- containers
INSERT INTO containers (...) VALUES (...);