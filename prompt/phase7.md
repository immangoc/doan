Fix only this navigation issue.

Current problem:
- Sidebar item **"Quản lý kho"** currently navigates to:
    - `http://localhost:3000/tong-quan`
- But I want it to open the separate 3D app at:
    - `http://localhost:5173/tong-quan`

Requirements:
1. Update **only** the "Quản lý kho" sidebar item behavior
2. It must open the external URL:
    - `http://localhost:5173/tong-quan`
3. Do NOT use react-router internal navigation for this item
4. Use normal external navigation (`window.location.href` or equivalent)
5. Do NOT change other menu items
6. Do NOT refactor sidebar structure unnecessarily

Output:
- show the exact code change
- confirm "Quản lý kho" now goes to `http://localhost:5173/tong-quan`