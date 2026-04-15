# Claude Working Instruction — Real Chat Message Feature (Admin ↔ Other Roles)

## ROLE

You are a **senior fullstack engineer** working on:

- Backend: `warehouse-service`
- Frontend: `do-an-full`

Your task is to implement the **real chat message feature** for the existing support chat UI.

---

## OBJECTIVE

Currently the chat UI already exists and the behavior/UX is acceptable.

I want you to keep the current chat UI/flow as much as possible, but replace fake/static/demo data with **real backend data**.

### Main requirement
- **Admin can chat with other roles**
- Admin can choose role groups such as:
    - Khách hàng
    - Điều phối
    - Nhân viên kho
- Admin can search user by name to start/select chat
- Existing quick suggestion messages in UI can be kept
- Messages must be real data from backend
- No websocket/socket complexity needed
- Just **poll the API every 5 seconds** to refresh messages, similar to notifications

---

## STRICT SCOPE

Work ONLY on chat/message-related functionality.

Do not refactor unrelated modules.

Do not redesign the current chat widget UI.

Do not change the existing interaction style unless necessary for correctness.

---

## REQUIRED BUSINESS BEHAVIOR

### 1. Admin chat scope
- Admin can select a target role group
- Admin can search users by name inside that role group
- Admin can choose a user and open conversation
- Admin can send message to that user
- Admin can view message history with that user

### 2. Supported participants
At minimum support:
- Admin ↔ Khách hàng
- Admin ↔ Điều phối
- Admin ↔ Nhân viên kho

If backend role naming differs, map correctly to actual role codes/entities.

### 3. Real data only
Replace all fake data in chat with real data:
- recipient list
- search results
- conversation history
- sent messages
- unread/read status if current UI needs it

### 4. Polling
No socket required.

Instead:
- poll conversation/messages API every **5 seconds**
- only for the currently opened chat conversation or the current chat panel state
- keep it simple and stable

### 5. Existing quick suggestions
The current suggested quick-reply / quick-action messages in the chat UI may remain.

You may keep them as UI helpers, but:
- when clicked, they must send/use real message flow if applicable
- they must not be the source of fake conversation data

---

## REQUIRED FEATURE SET

You must implement or complete the following:

### Backend
Check whether backend already has:
- chat room / conversation entity
- chat message entity
- repository/service/controller
- user lookup by role + keyword
- conversation history APIs
- send message API

If something is missing or incomplete, add/fix it.

### Minimum backend APIs/features required

1. **Search users by role and name**
- admin chooses role
- admin searches recipient by name
- return matching users

2. **Get or create conversation**
- between admin and selected user

3. **Get conversation messages**
- ordered by time
- enough data for current UI

4. **Send message**
- persist message
- return saved message / success response

5. **Poll latest messages**
- frontend can re-fetch every 5 seconds using conversation id

6. **Optional unread support**
   If current UI already indicates unread behavior, support:
- unread count per conversation or messages
- mark conversation/messages as read
  Only add if needed by current UI.

---

## FRONTEND REQUIREMENTS

Use the existing chat widget/component currently shown in the UI.

You must:

- keep the current layout
- keep current role dropdown
- keep current search input
- keep current message area
- keep current input box
- keep current quick suggestion chips if already present

But replace fake data with real API-driven behavior.

### Frontend behavior required
- role dropdown loads/uses real role filter logic
- search field calls/searches real users by name
- selecting a user opens the correct real conversation
- chat history loads from backend
- sending message uses backend API
- messages refresh every 5 seconds
- fake sample chat history must be removed

---

## IMPORTANT IMPLEMENTATION RULES

### Backend
- follow existing architecture:
    - controller
    - service
    - repository
    - dto
- keep controller thin
- keep message creation/retrieval logic in service
- use authenticated current user from token
- ensure admin only accesses conversations allowed by role/user ownership

### Frontend
- keep UI design intact
- do not redesign the widget
- only replace fake data and wire real actions
- handle loading/empty/error states reasonably
- polling interval = 5 seconds
- do not use websocket/socket

---

## AUTH / SECURITY RULE

All chat APIs must:
- require valid login token
- use the authenticated user identity
- only allow users to access their own conversations
- prevent admin from seeing unrelated private conversations unless intended by current business logic

For this scope:
- admin can chat with selected user from allowed role groups
- non-admin side should only see their own conversation(s)

---

## MANDATORY EXECUTION METHOD

### Step 1 — Inspect current chat UI
Find:
- actual rendered chat component
- fake recipient data source
- fake chat history data source
- quick suggestion components
- role dropdown/search logic

### Step 2 — Inspect backend chat support
Check whether existing backend already has:
- chat room / conversation support
- message support
- user lookup by role/name
- conversation APIs

### Step 3 — Complete backend APIs
Add/fix required backend endpoints for:
- recipient search by role + name
- get/create conversation
- get messages
- send message
- optional unread/read if needed

### Step 4 — Integrate frontend
Wire the actual chat widget to:
- real recipient search
- real conversation loading
- real message sending
- 5-second polling refresh

### Step 5 — Remove fake data
Remove:
- hardcoded recipients
- fake message history
- demo-only conversation content

Keep only UI helpers like suggestion chips if needed.

### Step 6 — Final verification
Only mark done if:
- admin can search real users by name
- admin can open real conversation
- admin can send message
- recipient side can fetch conversation/messages
- messages refresh every 5 seconds
- fake chat data is gone

---

## REQUIRED OUTPUT FORMAT

# 1. Current Chat Coverage Review

## Frontend
- actual chat component:
- fake recipient data present: YES/NO
- fake message history present: YES/NO
- role filter present: YES/NO
- search input present: YES/NO
- quick suggestion chips present: YES/NO

## Backend
- conversation entity/service exists: YES/NO
- message entity/service exists: YES/NO
- recipient search API exists: YES/NO
- conversation history API exists: YES/NO
- send message API exists: YES/NO

---

# 2. Backend Changes

List all backend changes made:
- entity
- repository
- service
- controller
- DTOs
- role/name search support
- polling-compatible message retrieval

---

# 3. Frontend Changes

List all frontend changes made:
- real recipient search
- real conversation loading
- real send message flow
- 5-second polling
- fake data removed
- quick suggestions preserved or adapted

---

# 4. API Summary

List final chat APIs used, for example:
- search users by role/name
- get/create conversation
- get messages
- send message
- optional mark read / unread count if implemented

---

# 5. Final Verification

Explicitly confirm:

- admin can choose role group ✅/❌
- admin can search user by name ✅/❌
- admin can open real conversation ✅/❌
- admin can send real message ✅/❌
- conversation loads from backend ✅/❌
- messages refresh every 5 seconds ✅/❌
- fake chat data removed ✅/❌
- quick suggestion UI still works appropriately ✅/❌

Do NOT claim completion unless the real chat flow is working end-to-end.

---

## FINAL WARNING

Do not build a fancy socket solution.

Do not redesign the current chat widget.

Keep the current UI and interaction style, but replace fake data with real backend-backed chat.

Simple, stable polling every 5 seconds is enough.