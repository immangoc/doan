# Claude Working Instruction — Customer Chat Message With Admin

## ROLE

You are a **senior fullstack engineer** working on:

- Backend: `warehouse-service`
- Frontend: customer web / customer area in the current app

Your task is to implement the **customer-side chat message feature** so that the logged-in customer can chat with admin using real backend data.

---

## OBJECTIVE

Currently the customer web does not yet have working message/chat with admin.

I want:

- customer can open chat
- customer can see conversation with admin
- customer can send message to admin
- customer can receive messages from admin
- no fake/mock chat data
- no websocket/socket needed
- just poll API every **5 seconds** to refresh messages

Keep the implementation simple and stable.

---

## STRICT SCOPE

Work ONLY on customer-side chat messaging with admin.

Do not refactor unrelated modules.

Do not redesign the whole customer UI.

Do not implement complex realtime socket.

---

## REQUIRED BUSINESS BEHAVIOR

### 1. Conversation target
- Logged-in customer chats with admin
- If conversation does not exist yet, create it automatically when customer opens chat or sends first message

### 2. Customer capabilities
- open chat panel/page
- load conversation history with admin
- send message
- see messages from admin
- refresh every 5 seconds

### 3. Real data only
Replace/remove:
- fake message history
- fake demo conversation
- hardcoded messages
- local mock arrays

### 4. Polling only
- Poll backend every 5 seconds for the current customer-admin conversation
- No websocket/socket required

---

## BACKEND REQUIREMENTS

Check whether backend already has enough chat support from previous admin-chat implementation.

Verify and fix if needed:

1. get or create customer-admin conversation
2. get messages for current conversation
3. send message from current logged-in customer
4. enforce auth and ownership correctly
5. ensure customer only sees their own conversation(s)

If backend is missing anything, implement it cleanly in `warehouse-service`.

Use existing architecture:
- controller
- service
- repository
- dto

Keep controller thin and business logic in service.

---

## FRONTEND REQUIREMENTS

Use the existing customer web structure.

You must:

- identify the actual customer-side component/page where chat should live
- wire it to real backend APIs
- keep current UI style as much as possible
- add chat UI if needed in a minimal, clean way consistent with the app

### Required frontend behavior
- on opening chat, load customer-admin conversation
- show message list from backend
- allow customer to type and send message
- refresh messages every 5 seconds
- show loading / empty / error states reasonably
- no fake placeholder conversation data

---

## AUTH / SECURITY RULES

All chat APIs must:
- require valid login token
- use the authenticated customer identity
- ensure customer can only access their own conversation with admin
- prevent customer from reading other users' conversations

---

## MANDATORY EXECUTION METHOD

### Step 1 — Inspect current customer UI
Find:
- where customer chat/message should be placed
- whether there is already an existing component
- whether there is fake/mock chat data

### Step 2 — Inspect backend chat support
Check:
- whether existing admin chat backend APIs can already support customer side
- whether conversation/message ownership rules are correct
- whether customer can fetch and send messages correctly

### Step 3 — Complete backend if needed
Add/fix APIs for:
- get/create conversation with admin
- get messages
- send message
- customer auth/ownership checks

### Step 4 — Integrate frontend
Wire customer chat UI to:
- real conversation API
- real message list API
- real send message API
- 5-second polling

### Step 5 — Remove fake data
Remove all fake/mock/demo conversation content from the customer chat UI.

### Step 6 — Final verification
Only mark done if:
- customer can open real conversation with admin
- customer can send real message
- admin messages appear in customer chat
- polling refreshes every 5 seconds
- no fake chat data remains

---

## REQUIRED OUTPUT FORMAT

# 1. Current Customer Chat Coverage Review

## Frontend
- actual customer chat component/page:
- fake chat data present: YES/NO
- send message UI present: YES/NO

## Backend
- customer-admin conversation API exists: YES/NO
- get messages API exists: YES/NO
- send message API exists: YES/NO
- ownership/auth checks correct: YES/NO

---

# 2. Backend Changes

List all backend changes made:
- controller
- service
- repository
- dto
- auth/ownership fixes

---

# 3. Frontend Changes

List all customer-side frontend changes made:
- real conversation loading
- real message sending
- 5-second polling
- fake data removed
- UI placement/component updated

---

# 4. API Summary

List final chat APIs used for customer side:
- get/create conversation
- get messages
- send message

---

# 5. Final Verification

Explicitly confirm:

- customer can open chat with admin ✅/❌
- customer can load real conversation history ✅/❌
- customer can send real message ✅/❌
- customer receives admin messages via polling ✅/❌
- messages refresh every 5 seconds ✅/❌
- fake chat data removed ✅/❌

Do NOT claim completion unless customer chat works end-to-end with real backend data.

---

## FINAL WARNING

Do not build websocket/socket.

Do not redesign the customer app.

Keep it simple:
- real backend APIs
- polling every 5 seconds
- customer ↔ admin conversation only
- no fake data