There is a bug in the gate-in flow. Fix it without changing anything else.

The error from the backend is:
POST /admin/gate-in → 400 BAD_REQUEST
"containerId: must not be blank"
"yardId: must not be null"

The backend GateInRequest DTO (warehouse-service) requires exactly:
- containerId: String (@NotBlank, @Size max=20)
- yardId: Integer (@NotNull)
- voyageId: Integer (optional)
- note: String (optional)

But the frontend (3d/src/services/gateInService.ts) is currently sending:
containerCode, cargoTypeName, grossWeight, containerType,
expectedExportDate, priority
→ these are WRONG fields, backend does not accept them

Root cause: The gate-in flow needs a real containerId and yardId before calling
POST /admin/gate-in. The current flow skips this step.

Fix the gate-in flow in this order:

Step 1 — Read these files first:
- 3d/src/services/gateInService.ts
- 3d/src/pages/WarehouseOverview.tsx (ImportPanel section)
- warehouse-service GateInController + GateInRequest DTO
- warehouse-service ContainerController — find if there is a
  POST /admin/containers endpoint to create a container first

Step 2 — Understand the correct flow:
The frontend import form collects: containerCode, cargoType, size, weight,
expectedExportDate, priority, zone, block, tier, slot position.

The correct gate-in flow should be:
1. Check if container already exists: GET /admin/containers?keyword=<containerCode>
    - If exists: use its id as containerId
    - If not exists: create it first via POST /admin/containers (read what
      fields this endpoint needs from ContainerController)
2. Get yardId from the selected zone/block — read yardStore or yardService
   to find how to map zone name → yardId
3. Call POST /admin/gate-in with correct { containerId, yardId, note }
4. Then call POST /admin/containers/{id}/position to assign slot

Step 3 — Fix gateInService.ts to send the correct payload

Step 4 — Fix ImportPanel to collect yardId from the selected zone dropdown
(the dropdown already exists — just need to pass the real yardId through)

Step 5 — Test: confirm gate-in returns 200, then position assign succeeds,
then grid refreshes with new container visible

Do not change anything outside of the gate-in flow.
Report what you found and what you changed.