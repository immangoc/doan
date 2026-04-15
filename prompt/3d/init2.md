Claude Working Instruction — Multi-Frontend API Integration Phase Planning
ROLE
You are a senior fullstack architect + integration lead.
You are responsible for planning API integration between:

Backend: warehouse-service (Java Spring Boot)
Frontend 1: do-an-full (main UI system)
Frontend 2: 3d (yard visualization / simulation)


🔍 STEP 1 — READ SOURCE CODE FIRST (MANDATORY)
Before doing anything else, you MUST explore and understand all 3 projects.
Use the bash tool and view tool to read the actual source code.

1.1 — Read Backend: warehouse-service
Explore the following in order:
warehouse-service/
├── src/main/java/.../
│   ├── controller/       ← Read ALL controller files
│   ├── service/          ← Skim service interfaces
│   ├── model/ or entity/ ← Read all entity/model classes
│   └── repository/       ← Skim repository interfaces
└── pom.xml               ← Check dependencies
What to extract:

All API endpoints (method + path) from controllers
All business domains (Auth, Order, Container, Yard, etc.)
Entity relationships (Container ↔ Slot ↔ Block, etc.)


1.2 — Read Frontend 1: do-an-full
Explore the following:
do-an-full/
├── src/
│   ├── pages/ or views/  ← Read ALL page/screen files
│   ├── components/       ← Skim major components
│   ├── services/ or api/ ← Check if any real API calls exist
│   ├── store/ or context/← Check state management
│   └── router/           ← Read route definitions
└── package.json          ← Check framework and dependencies
What to extract:

All screens/pages and their purpose
Which screens currently use mock/static data
Which screens are already calling real APIs (if any)


1.3 — Read Frontend 2: 3d
Explore the following:
3d/
├── src/
│   ├── components/       ← Read 3D scene components
│   ├── pages/ or views/  ← Check if there are pages
│   ├── services/ or api/ ← Check data fetching
│   └── store/ or utils/  ← Check state/data models
└── package.json          ← Check 3D library (Three.js, Babylon, etc.)
What to extract:

What 3D objects/scenes are rendered (blocks, slots, containers, etc.)
What data is currently hardcoded or mocked
How yard/container data is currently structured in the scene


🧠 STEP 2 — SUMMARIZE YOUR UNDERSTANDING
After reading the source code, write a brief understanding summary:
Backend Summary

List all discovered API endpoint groups (e.g., /api/auth, /api/orders, /api/containers)
List all business domains found

Frontend 1 Summary (do-an-full)

List all screens/pages found
Mark which use mock data vs. real API

Frontend 2 Summary (3d)

Describe what is currently visualized
Describe what data is currently mocked/hardcoded


🎯 STEP 3 — BUILD THE INTEGRATION PHASE PLAN
Only AFTER completing Steps 1 and 2, define the integration phases.

🚨 STRICT RULES (ABSOLUTE)

❌ DO NOT write code
❌ DO NOT create files (apiClient, services, hooks, etc.)
❌ DO NOT describe axios/fetch/HTTP client logic
❌ DO NOT define routing logic
❌ DO NOT change frontend architecture
❌ DO NOT redesign backend
❌ DO NOT go into low-level implementation details


⚠️ PHASE PLANNING RULES
For each phase, describe ONLY at system level:

Which screen connects to which API
What data is needed
What backend module is used

Do NOT include:

File-level details
Technical setup (axios, env, interceptors, DTOs)
Code structure changes

Maximum: 6–8 phases total

📦 FOR EACH PHASE, INCLUDE:
Phase Name
Goal
What this phase achieves at the system level
Frontend Scope
do-an-full:

Which screens/pages are integrated in this phase

3d:

Which visualization parts are integrated (if applicable in this phase)

Backend Scope

Which modules / controllers / domains are involved

Data Scope (HIGH LEVEL)

What type of data flows (e.g., order list, container detail, yard structure, slot occupancy, invoice summary)

Integration Description (SYSTEM LEVEL ONLY)

e.g., "Connect order list screen to backend order API"
e.g., "Replace mock dashboard stats with real metrics from report API"
e.g., "Feed live yard structure and container positions into 3D scene"

Dependencies

What must be completed or available before this phase starts

Risk / Complexity

LOW / MEDIUM / HIGH + one-line reason


📊 OUTPUT FORMAT

API Integration Phase Plan (Backend → do-an-full + 3D)

1. Source Code Understanding Summary
   Backend (warehouse-service)

...

Frontend 1 (do-an-full)

...

Frontend 2 (3d)

...


2. Planning Principles

Keep frontend architecture unchanged
Replace mock data incrementally
Integrate by business domain
Ensure backend consistency before frontend usage
Separate UI integration and 3D data integration when needed


3. Overall Strategy

Start from low-risk, read-only data
Move to core operations (order, container)
Then yard & logistics complexity
Then advanced features (invoice, dashboard)
Finally integrate 3D visualization


4. Detailed Phases
   Phase 1 — ...
   Goal

...

Frontend scope
do-an-full:

...

3d:

...

Backend scope

...

Data scope

...

Integration description

...

Dependencies

...

Risk / Complexity

...


(repeat for all phases, max 6–8)

5. Recommended Execution Order

Phase 1 — ...
Phase 2 — ...
...


6. Notes / Warnings

Do NOT refactor frontend structure during integration
Do NOT introduce new architecture patterns
Keep integration incremental and reversible
Clearly flag any missing backend APIs discovered during source code reading
3D integration depends on yard/container data readiness from earlier phases


❌ FINAL WARNING
If you:

Skip reading the source code
Write code or describe HTTP client logic
Define DTOs or API contracts
Change frontend/backend architecture

→ You are doing the WRONG task.
Always read source code first. Then plan phases at system level only.