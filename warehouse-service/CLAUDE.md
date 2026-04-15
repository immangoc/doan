# Claude Working Instruction

## Role

You are a senior backend architect and system designer.

I am building a **Warehouse / Port Logistics system** using **Spring Boot** (`warehouse-service`).

Before writing **any code**, you should first read and understand the project carefully.

---

## Required Reading (Mandatory)

Please read and analyze all of the following files:

1. `data.sql`
   - Database schema
   - Relationships
   - Constraints

2. `pom.xml`
   - Dependencies
   - Framework stack

3. `application.yml`
   - Configurations
   - Environment settings
   - Database connection

4. `docs.md`
   - Full system design
   - Algorithm description
   - Very important

5. `list-function.txt`
   - Full feature list
   - Business requirements

6. `architecture.txt`
   - System architecture
   - Module design

> Do not skip any file.

---

## How to Read Files

- You can read files directly using your internal capabilities.
- There is no need to execute shell, bash, or python commands to read files.
- Simply access and process the file contents safely.
- Focus on understanding the content, not on how to read it.

---

## Your Task (No Coding Yet)

### Step 1: Summarize the System

Explain clearly:

- What system is this?
- What are the main business domains?
- What are the core flows?

---

### Step 2: Analyze the Database

Identify and explain:

- Key entities (`container`, `yard`, `slot`, `order`, etc.)
- Relationships between entities
- Important constraints affecting business logic

---

### Step 3: Analyze the Architecture

Determine and explain:

- Is this a monolith or microservice-oriented system?
- What are the main modules/services?
- Where should the optimization algorithm live?

---

### Step 4: Analyze Features

Group features by domain, including at minimum:

- User / Auth
- Booking
- Yard Management
- Optimization
- Monitoring

Also identify:

- Core features
- Secondary features

---

### Step 5: Propose Development Phases

This is the most important part.

You must break the system into multiple implementation phases.

Each phase must include:

- Goal
- Scope (what features are included)
- Required tables
- APIs or modules involved
- Complexity level

#### Example phase structure

- Phase 1: Core Foundation
- Phase 2: Booking & Orders
- Phase 3: Yard Management
- Phase 4: Container Placement Algorithm
- Phase 5: Monitoring & Alerts
- Phase 6: Optimization & Improvements

Each phase must be:

- Logical
- As independent as possible
- Suitable for incremental development

---

## Output Format

Return the result in clean, structured markdown with the following sections:

1. System Overview
2. Database Analysis
3. Architecture Analysis
4. Feature Breakdown
5. Development Phases

> The Development Phases section must be the most detailed.

---

## Important Notes

- Do not write code yet
- Do not generate APIs yet
- Do not assume missing information
- Base everything only on the provided files
- Focus on analysis and system understanding

If anything is unclear, ask before proceeding.