# Task: Reset Container Data & Implement Proper Container Flow

## Context

The current test data for containers is broken and misleading.
We are starting fresh with a clean, realistic flow.

---

## STEP 1 — Understand the full business flow first

The correct flow is:

```
do-an-full (Customer side)          3d (Operator side)
──────────────────────────────────────────────────────
Customer logs in as "Khách hàng"
Creates a container
  → status: AVAILABLE
  → linked to an order
  → no position yet
                                    Operator sees container
                                    in "Container chờ nhập" list
                                    
                                    Clicks a container from the list
                                    → form auto-fills with container data
                                    
                                    Clicks "Nhận gợi ý vị trí"
                                    → backend recommends a slot
                                    
                                    Clicks "Xác nhận nhập"
                                    → gate-in → assign position
                                    → container appears in 3D scene
```

---

## STEP 2 — Delete all fake container data

In warehouse-service, find and clean up:

1. Read all migration SQL files to find container INSERT statements:
    - V2__seed_data.sql
    - V5__test_data.sql
    - V7__more_positions.sql
    - V8__fix_test_data.sql (if exists)
    - Any other migration with container/container_positions INSERTs

2. Create a new migration file `V9__reset_containers.sql`:
   ```sql
   -- Remove all test container positions
   DELETE FROM container_positions;
   
   -- Remove all test containers
   DELETE FROM container;
   
   -- Reset sequences if needed
   -- (check if sequences exist for these tables)
   ```

3. Do NOT delete: yards, zones, blocks, slots, users, cargo_types,
   container_types, orders structure — only container and container_positions data.

---

## STEP 3 — Add container CRUD to customer side (do-an-full)

The customer at `localhost:3000/warehouse/customer/my-containers` currently
shows "Không có container phù hợp" with no way to create one.

Read:
- do-an-full/src/pages/customer/ — find the my-containers page
- warehouse-service ContainerController — find what endpoints exist for
  customer-side container creation

Then add to the customer page:

### 3A — "Thêm container" button
Opens a form/modal with these fields:
- Mã container (text input) — e.g. CTN-2026-0001
- Loại container (dropdown) — fetch from GET /api/container-types
- Loại hàng (dropdown) — fetch from GET /api/cargo-types
- Trọng lượng (number input, đơn vị: tấn)
- Ngày xuất dự kiến (date picker)
- Ghi chú (optional textarea)

On submit: POST /admin/containers or the correct customer endpoint
After success: container appears in list with status "AVAILABLE"

### 3B — Container list display
Each container card shows:
- Mã container
- Loại hàng + Loại container
- Trọng lượng
- Trạng thái (badge: AVAILABLE / IN_YARD / GATE_OUT / OVERDUE)
- Ngày tạo

### 3C — Container detail / edit
Click a container → show detail with option to edit or delete
(only if status is still AVAILABLE)

---

## STEP 4 — Fix "Container chờ nhập" list in 3d app

Currently the waiting list shows "Order #11", "Order #12" etc — just order
numbers with no useful info. This needs to show container data.

Read:
- 3d/src/services/gateOutService.ts — find fetchWaitingContainers()
- What does GET /admin/orders?statusName=APPROVED currently return?
- Does the response include container details or just order metadata?

Fix the waiting list to show per container:
- Mã container
- Loại hàng
- Loại container (20ft/40ft)
- Trọng lượng
- Tên khách hàng (from order)

If the API doesn't return container details in the order response:
- Either call GET /admin/containers?orderId=X to get containers per order
- Or update the backend endpoint to include container info in order response

---

## STEP 5 — Auto-fill import form when clicking a waiting container

Currently clicking "Nhập kho" opens a blank form.

Change the flow:

1. When operator clicks a container from the "Container chờ nhập" list:
    - The import panel opens automatically
    - All fields are pre-filled from the selected container:
        - Mã container → filled (read-only)
        - Loại hàng → filled from container data
        - Loại container → filled (20ft/40ft)
        - Trọng lượng → filled
        - Ngày xuất dự kiến → filled from order expected date
    - Operator only needs to click "Nhận gợi ý vị trí" then confirm

2. The "Nhập kho" button (manual entry) should still work for
   containers not in the waiting list (operator typing a container code manually)

3. In the import flow, when a container from waiting list is selected:
    - Skip the "create new container" step in gate-in
    - Use the existing containerId from the waiting list container
    - Only call: POST /admin/gate-in (with existing containerId) +
      POST /admin/containers/{id}/position

---

## STEP 6 — Fix gate-in flow for existing containers

The current bug: gate-in creates a NEW container even when one already exists.

Read warehouse-service GateInController and GateInRequest DTO.

The correct flow for an existing container (from waiting list):
```
POST /admin/gate-in
Body: {
  containerId: "CONT0001",   ← existing container ID
  yardId: 1,                 ← from selected zone
  note: "..."
}
→ Response should include the containerId for next step

POST /admin/containers/{containerId}/position
Body: {
  slotId: X,
  tier: 1
}
```

Fix gateInService.ts to:
- When container is from waiting list: send existing containerId, skip container creation
- When container is manually entered (new): check if container exists first,
  create if not, then gate-in
- Always read containerId from gate-in response correctly for the position step

---

## STEP 7 — Verify end-to-end flow

After all fixes, test this complete flow manually:

1. Login as customer in do-an-full → go to "Container của tôi"
2. Click "Thêm container" → fill form → submit
3. Container appears in list with status AVAILABLE ✅
4. Login as admin in do-an-full → go to 3d app
5. Open "Container chờ nhập" → new container appears in list ✅
6. Click the container → import form auto-fills ✅
7. Click "Nhận gợi ý vị trí" → suggestion appears ✅
8. Click "Xác nhận nhập" → container appears in 3D scene ✅
9. Container status changes to IN_YARD ✅

---

## Rules

- Do STEP 2 first — clean data before building anything
- Do STEP 3 (customer side) before STEP 4-5 (operator side) —
  operators need real containers to exist before the list can show them
- Do NOT re-add any hardcoded/fake container data
- After STEP 2, the only way to create containers is through the customer UI
- Report after each step what was done before moving to the next