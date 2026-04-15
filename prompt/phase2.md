# Claude Working Instruction — Notification Feature for Order Approval / Rejection

## ROLE

You are a **senior fullstack engineer** working on:

- Backend: `warehouse-service`
- Frontend: `do-an-full`

Your task is to implement and complete the **notification feature** for order approval/rejection only.

---

## STRICT SCOPE

Work ONLY on notification-related flow for:

- duyệt đơn hàng
- từ chối đơn hàng

Do not expand to other notification types yet.

❌ DO NOT implement unrelated features  
❌ DO NOT review the whole system  
❌ DO NOT refactor unrelated modules  
❌ DO NOT redesign the UI

---

## CURRENT GOAL

Right now, I only need notifications to be generated when:

1. an order is **approved**
2. an order is **rejected**

When either action happens, the system must create a real notification and show it in the frontend notification panel.

---

## BUSINESS REQUIREMENT

### Trigger conditions
Create notification only when:
- operator/admin approves an order
- operator/admin rejects an order

### Notification target
The notification must be sent to the correct user related to the order:
- normally the customer / owner of that order

### Notification content
Notification must contain enough data for UI usage, for example:
- title
- message/content
- type/category
- related order id
- status read/unread
- created time

For rejected orders, include rejection reason if available.

---

## REQUIRED FEATURES

Implement the notification module fully for this scope.

### Backend requirements

You must check whether backend already has:
- notification entity/table
- notification repository
- notification service
- notification controller/APIs

If anything is missing or incomplete, add/fix it.

### Minimum backend features required

1. **Create notification automatically**
    - when order is approved
    - when order is rejected

2. **List my notifications**
    - return notifications for current logged-in user
    - support unread/all filtering if needed by current UI

3. **Unread count**
    - return number of unread notifications

4. **Mark one notification as read**

5. **Mark all notifications as read**

6. **Optional delete/hide notification**
    - only if current UI already needs it
    - if not needed, do not force it

### Frontend requirements

Integrate the real notification API into the existing notification bell/panel.

The notification UI must support:
- load notifications from backend
- show unread count
- filter unread / all if current UI has tabs
- mark one as read
- mark all as read
- reflect new notification after order approve/reject
- remove fake/mock notification data

---

## VERY IMPORTANT IMPLEMENTATION RULE

You must use the **existing notification UI structure** in `do-an-full`.

Do not redesign the component.

You must:
- identify the actual rendered notification component
- remove fake/static notification data from it
- wire it to real backend APIs

---

## ORDER ACTION INTEGRATION

You must inspect the existing order approval/rejection flow.

When user clicks:
- **Duyệt**
- **Từ chối**

You must ensure:
1. order status is updated correctly
2. notification is created correctly
3. frontend notification bell/panel can fetch and display the new notification

If there is already order approval/rejection code, extend it properly.

Do not duplicate business logic.

---

## AUTH RULE

All notification APIs must:
- require valid login token
- only return notifications of current logged-in user
- respect role/user ownership

Do not expose notifications of other users.

---

## MANDATORY EXECUTION METHOD

### Step 1 — Inspect current backend notification support
Check whether the backend already has:
- notification table/entity
- service/controller
- APIs
- read/unread support

### Step 2 — Inspect order approval/rejection flow
Find the exact service logic where order is:
- approved
- rejected

Integrate notification creation there.

### Step 3 — Complete backend APIs
Ensure backend has all required notification APIs:
- list my notifications
- unread count
- mark one read
- mark all read

### Step 4 — Inspect actual rendered frontend notification component
Find:
- actual notification bell component
- actual dropdown/panel component
- current fake/mock data source

Remove fake data and wire real APIs.

### Step 5 — Verify end-to-end behavior
Only mark done if:
- approving order creates notification
- rejecting order creates notification
- notification appears in bell panel
- unread count updates
- mark read works
- mark all read works

---

## REQUIRED OUTPUT FORMAT

# 1. Current Notification Coverage Review

## Backend
- notification entity/table: YES/NO
- notification service: YES/NO
- notification controller: YES/NO
- list API: YES/NO
- unread count API: YES/NO
- mark read API: YES/NO
- mark all read API: YES/NO

## Frontend
- actual notification component:
- fake data currently used: YES/NO
- unread/all tabs present: YES/NO

---

# 2. Backend Changes

List all notification-related backend changes:
- entity
- repository
- service
- controller
- order approval/rejection integration

---

# 3. Frontend Changes

List all notification-related frontend changes:
- notification bell/panel wired to API
- fake data removed
- unread count wired
- mark read wired
- mark all read wired

---

# 4. API Summary

List final notification APIs used, for example:
- GET ...
- PATCH ...
- POST ...

Include which one is triggered by:
- approve order
- reject order

---

# 5. Final Verification

Confirm all of the following:

- approving order creates notification ✅/❌
- rejecting order creates notification ✅/❌
- notification panel shows real backend data ✅/❌
- unread count works ✅/❌
- mark one as read works ✅/❌
- mark all as read works ✅/❌
- fake notification data removed ✅/❌

---

## IMPORTANT RULES

- Keep backend architecture consistent:
    - controller
    - service
    - repository
    - dto
- Keep frontend UI/layout unchanged
- Do not invent extra notification types
- Implement ONLY approval/rejection notification flow for now
- Do not claim completion unless notification really appears after approve/reject