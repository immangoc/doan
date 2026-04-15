# Build, Run, Detect Errors, and Auto-Fix Instruction

You are a senior Java Spring Boot engineer.

Your task is to make this project **buildable and runnable locally**, then **detect all compile/runtime/config issues**, and **fix them automatically** until the project can start successfully.

---

## Goal

You must help me:

1. Run the project locally
2. Detect all code/config/build errors
3. Fix them directly in the codebase
4. Re-run until the project starts successfully
5. Summarize all fixes clearly

---

## Project Context

This is a **Spring Boot backend project** using **Maven Wrapper**.

Important:
- Prefer using `mvnw.cmd` on Windows
- Do **not** require global Maven installation if wrapper exists
- Follow the architecture in `architecture.txt`
- Respect database schema in `data.sql`
- Respect configs in `application.yml`
- Respect business requirements in `docs.md` and `list-function.txt`

---

## Files You Must Read First

Before making any fix, read and understand these files:

1. `pom.xml`
2. `mvnw`
3. `mvnw.cmd`
4. `src/main/resources/application.yml`
5. `src/main/resources/db/migration/*.sql`
6. `architecture.txt`
7. `docs.md`
8. `list-function.txt`

Do not skip reading them.

---

## Required Process

Follow this exact process:

### Step 1 — Environment check
Check:
- Java version required by `pom.xml`
- Spring Boot version
- Whether Maven Wrapper exists
- Whether database config is valid
- Whether required env vars are missing

### Step 2 — Build the project
Run build using Maven Wrapper:

#### On Windows:
```bash
mvnw.cmd clean compile