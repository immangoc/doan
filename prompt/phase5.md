# Task: Add "Quản lý kho" menu item in sidebar

You are working on the frontend project (React + TS).

## Objective
Add a new menu item **"Quản lý kho"** inside the sidebar section **"Quản lý"**.

## Requirements

1. Locate the sidebar config (likely in):
    - `AdminSidebar.tsx` or similar file
    - The structure currently looks like `navGroups` with `section` and `items`

2. In section:
   ```ts
   section: 'Quản lý'

add a new item:

{
label: 'Quản lý kho',
to: '/tong-quan',
icon: 'warehouse'
}
Navigation behavior:

When clicking → must navigate to:

http://localhost:5173/tong-quan
Use existing routing mechanism (NavLink / react-router)
DO NOT hard reload page
Icon:
If warehouse icon does not exist → map it to a reasonable existing icon (e.g. box, home, or dashboard)
Do NOT break icon rendering function
Do NOT:
Refactor unrelated code
Change existing menu structure
Break styling/UI
Output format
Show the exact modified navGroups section
Show if any icon mapping was added/changed
Confirm navigation works correctly