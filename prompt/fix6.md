# Claude Working Instruction — Fix Customer Chat Input / Send Message and Complete Chat Flow

## ROLE

You are a **senior fullstack engineer** working on:

- Backend: `warehouse-service`
- Frontend: customer web / current customer chat widget

Your task is to debug and fix the customer chat feature so it becomes fully usable.

---

## CURRENT PROBLEM

The customer chat UI is partially integrated, but it is not working correctly.

Observed issues:
- customer chat opens, but conversation may fail to open
- the input is currently not usable / cannot type message properly
- send action is blocked or disabled
- current state shows things like:
    - "Không thể mở cuộc trò chuyện"
    - or "Chọn người dùng trước..."
    - or input stays disabled / cannot send
- chat flow is not fully complete yet

So now you must DEBUG the real flow and fix it properly.

---

## OBJECTIVE

Make the customer chat feature fully usable with real backend data.

Required final behavior:
1. customer can open chat with admin
2. conversation is created/fetched correctly
3. customer can type into the message input normally
4. customer can send message
5. sent message is persisted in backend
6. customer can see admin replies
7. polling refresh works every 5 seconds
8. no fake/mock chat data remains

---

## STRICT SCOPE

Work ONLY on customer chat/message functionality.

Do not refactor unrelated modules.

Do not redesign the chat widget.

Do not implement websocket/socket.

Use simple polling every 5 seconds only.

---

## VERY IMPORTANT DEBUG RULE

Do NOT assume the bug is just a disabled input.

You must debug the full chain:

1. actual rendered customer chat component
2. selected conversation/user state
3. get/create conversation API
4. load messages API
5. send message API
6. frontend input disabled conditions
7. frontend submit/send conditions
8. ownership/auth validation in backend

If any step is broken, fix it.

---

## MANDATORY DEBUG METHOD

### Step 1 — Inspect actual rendered customer chat component
Find:
- the real mounted customer chat component
- where the input disabled condition comes from
- where placeholder text like:
    - "Không thể mở cuộc trò chuyện"
    - "Chọn người dùng trước..."
    - "Đang kết nối..."
      is controlled
- whether conversation state is null/undefined
- whether selected admin/conversation id is missing

### Step 2 — Trace conversation open/create flow
Verify:
- does customer chat correctly create or fetch conversation with admin?
- is the conversation API returning success?
- is the returned conversation id stored in frontend state?
- if conversation creation fails, why?

Fix this first if broken.

### Step 3 — Trace message input state
Verify:
- why input is disabled
- which condition blocks typing
- whether it incorrectly requires selecting a user manually on customer side
- whether send button is disabled for wrong reason
- whether current chat state never becomes "ready"

Customer side should NOT require manual recipient selection like admin side.
It should auto-chat with admin.

### Step 4 — Trace send message flow
Verify:
- typing works
- submit handler is called
- request payload is correct
- backend accepts request
- message is stored
- frontend appends/refetches message correctly

### Step 5 — Trace polling flow
Verify:
- once conversation is established, messages are reloaded every 5 seconds
- admin replies become visible
- polling does not break input state

---

## EXPECTED CUSTOMER CHAT BEHAVIOR

On customer side, the flow should be simple:

- customer opens support chat
- system automatically opens/creates conversation with admin
- customer can type immediately
- customer sends message
- customer sees conversation history
- customer sees new messages after polling refresh

No manual recipient selection should block the customer input.

---

## BACKEND REQUIREMENTS

Verify and fix backend APIs if needed:

- get/create customer-admin conversation
- get conversation messages
- send message
- auth/ownership checks

If backend is missing something or returning wrong data, fix it in `warehouse-service` using existing architecture:
- controller
- service
- repository
- dto

---

## FRONTEND REQUIREMENTS

Fix the actual customer chat widget/component so that:

- input becomes enabled when conversation is ready
- conversation is auto-created/fetched with admin
- placeholder and disabled state logic are correct
- send button works
- message list updates correctly
- fake chat data is removed
- keep UI layout intact

---

## REQUIRED OUTPUT FORMAT

# 1. Root Cause Analysis

Explain exactly why the customer could not type/send message.

Check and report:
- actual customer chat component found: YES/NO
- conversation created/fetched successfully: YES/NO
- conversation id stored in frontend state: YES/NO
- input disabled condition was wrong: YES/NO
- send handler was blocked: YES/NO
- backend send API worked: YES/NO

---

# 2. Backend Fixes

List all backend fixes made:
- conversation API fixes
- send message API fixes
- auth/ownership fixes
- DTO/controller/service/repository changes

---

# 3. Frontend Fixes

List all frontend fixes made:
- input enable/disable logic fixed
- auto open/create admin conversation fixed
- send message handler fixed
- polling logic fixed
- error/placeholder state fixed
- fake data removed

---

# 4. Final Verification

Explicitly confirm:

- customer chat opens successfully ✅/❌
- customer can type in input ✅/❌
- customer can send real message ✅/❌
- conversation persists in backend ✅/❌
- admin messages appear after polling ✅/❌
- no fake chat data remains ✅/❌

Do NOT claim completion unless the customer can actually type and send messages end-to-end.

---

## FINAL WARNING

Do not only patch the input visually.

You must fix the real conversation state and send-message flow so the customer can actually chat with admin.