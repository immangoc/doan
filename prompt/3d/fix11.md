Two backend bugs to fix in warehouse-service. Read before touching anything.

--- BUG 1: LazyInitializationException in assignPosition ---

Error: could not initialize proxy [YardZone#1] - no Session
Location: GateInMapperImpl.toPositionResponse() → positionSlotBlockZoneZoneName()

Root cause: The Slot entity has a @ManyToOne relationship to Block,
Block has @ManyToOne to Zone, Zone has @ManyToOne to YardZone.
One of these is marked @ManyToOne(fetch = FetchType.LAZY) and the mapper
tries to call .getZoneName() after the Hibernate session is closed.

Fix options (pick ONE):

Option A — Add @Transactional to the service method:
Read GateInServiceImpl.assignPosition() — if it is not @Transactional,
add @Transactional. This keeps the session open until the mapper finishes.

Option B — Fix the mapper to use JOIN FETCH:
In the repository query that fetches the slot/position, add JOIN FETCH
for the full chain: slot → block → zone → yardZone
so all data is loaded within the session before mapping.

Option C — Change fetch type:
In the entity where YardZone is @ManyToOne(fetch = LAZY),
change to FetchType.EAGER.
Only do this if the entity is small and not performance-sensitive.

Read GateInServiceImpl.assignPosition() first.
If it already has @Transactional → Option B or C.
If it does NOT have @Transactional → Option A is the quickest fix.

--- BUG 2: Container gross weight exceeds maximum stack weight ---

Error: BusinessException: Container gross weight exceeds maximum stack weight: 123
This means the validation logic rejects containers where grossWeight >
the slot's maxStackWeight. 123 (kg) is being rejected.

Read the validation logic:
- GateInServiceImpl or ContainerPositionServiceImpl — find where
  "maximum stack weight" is checked
- Find what value maxStackWeight is set to for the slots in seed data

Fix options:
Option A — Fix the seed data: update slots to have a higher maxStackWeight
(e.g. 30000 kg is typical for container yards)

Option B — Fix the validation: the weight unit may be mismatched.
Customer enters weight in kg (123 kg) but validation compares against
maxStackWeight stored in tonnes — 123 kg vs 30 tonnes threshold would fail.
Check the unit and normalize before comparison.

Option C — Make the validation a warning not a hard block:
If grossWeight exceeds maxStackWeight, log a warning but still allow
the assignment (soft validation). Only block if truly critical.

Read the slot entity and seed data to find what maxStackWeight values exist.
Then apply the appropriate fix.

--- Fix order ---
1. BUG 2 first (weight validation) — it's blocking gate-in before
   position assignment even runs
2. BUG 1 second (lazy loading) — it's failing at the response mapping step

After both fixes: confirm POST /admin/containers/{id}/position returns 201
and the container appears in the 3D scene.