# CONTINUE IMPLEMENTATION — DO NOT RESTART

You are continuing work on an existing implementation.

---

## CURRENT STATE (IMPORTANT)

The project has already been partially implemented:

- Some frontend files were modified
- Some API integrations were attempted
- BUT:

❌ UI still shows fake/static data  
❌ Many screens are not calling real APIs  
❌ Network tab does NOT show expected API calls  
❌ Some edited files might NOT be the actual rendered components

---

## VERY IMPORTANT RULE

👉 DO NOT restart from beginning  
👉 DO NOT redo previous steps  
👉 DO NOT re-explain plan

You MUST:

- continue from CURRENT CODEBASE STATE
- FIX what is still wrong
- NOT repeat what was already done

---

## YOUR TASK NOW

Continue based on this instruction:

:contentReference[oaicite:1]{index=1}

BUT focus ONLY on:

---

## 🎯 FOCUS: FIX REAL RENDERED SCREENS

You must:

### 1. Find actual rendered components
- check route → component mapping
- ensure you are editing the REAL component used by UI
- detect duplicate / unused files

---

### 2. Remove ALL fake data from visible UI
- hardcoded arrays
- fake stats/cards
- fake chart data
- mock constants
- leftover Supabase/demo logic

👉 DO NOT leave any fake business data

---

### 3. Ensure real API is actually called
For each screen:

- must trigger request in browser
- must use backend response
- must NOT fallback to fake data

---

### 4. Complete CRUD (only where applicable)

For each module:
- LIST
- DETAIL (Xem)
- CREATE (Thêm)
- UPDATE (Sửa)
- DELETE (Xóa)

---

## 🚨 CRITICAL VALIDATION

You are NOT allowed to say "done" unless:

- opening page → API request appears in Network tab
- table data comes from API
- clicking:
  - xem → calls API
  - thêm → calls API
  - sửa → calls API
  - xóa → calls API
- UI changes after API response

---

## OUTPUT FORMAT (STRICT)

# 1. Fixed Screens

For each screen:
- actual component fixed:
- fake data removed:
- API now called:
- CRUD status:

---

# 2. Wrong Files Previously Edited

List any files that were edited but NOT actually used by UI

---

# 3. API Verification

For each screen:
- API endpoint used:
- request triggered in browser: YES/NO

---

# 4. Remaining Issues

List ONLY what is still broken

---

## FINAL WARNING

If you:
- edit wrong component again
- leave fake data in UI
- do not trigger real API
- report success without real network calls

→ You are doing the WRONG task

---

Continue NOW from current code.