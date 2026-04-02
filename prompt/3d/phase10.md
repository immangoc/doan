Add a refresh button to the 3D and 2D visualization screens.

Read these files first:
- 3d/src/pages/Warehouse3D.tsx
- 3d/src/pages/Warehouse2D.tsx
- 3d/src/store/occupancyStore.ts — find the refreshOccupancy() or
  fetchAndSetOccupancy() function
- 3d/src/store/yardStore.ts — find the fetchAllYards() function

Then add a refresh button to both pages:

--- Warehouse3D.tsx and Warehouse2D.tsx ---

1. Add a "Làm mới" button in the top action bar (same row as
   "Nhập/Xuất" and "Tối ưu" buttons)

2. Button appearance:
    - Icon: refresh/reload icon (use a simple SVG rotate arrow or
      existing icon library already used in the project)
    - Label: "Làm mới"
    - Style: same secondary button style as other buttons in the bar
    - While loading: button shows spinning icon + disabled state

3. On click — refresh in this order:
   Step 1: re-fetch yard structure → fetchAllYards()
   Step 2: after yards loaded → re-fetch occupancy → fetchAndSetOccupancy(yards)
   Step 3: re-fetch dashboard stats → invalidate useDashboardStats cache
   or call the fetch function directly
   Step 4: if waiting list panel is open → re-fetch waiting containers

4. Loading state:
    - Button icon spins while refresh is in progress
    - Button is disabled during refresh to prevent double-click
    - After refresh completes: button returns to normal

5. Also add the same refresh to WarehouseOverview.tsx (the /tong-quan page)
   if it has the same action bar — find where "Nhập kho" and "Xuất kho"
   buttons are and add "Làm mới" next to them

Do not change any other logic — only add the button and wire it to
existing fetch functions.