The visual mismatch is now clear.

B2 sidebar: 1/2 slots — backend says B2 has only 2 slots total
B2 in 3D scene: renders a large grid area with many visible positions

This is a grid dimension mismatch — the 3D scene draws a grid based on
the visual layout (e.g. 4x8=32 positions) but the backend only has 2 real
slots for that block.

Two options. Pick ONE:

--- OPTION A: Fix backend seed data (recommended) ---
Add more slots to each block so backend matches what the 3D scene shows visually.

Read the 3D scene to find what grid size it expects per block:
- 3d/src/adapters/slotGridAdapter.ts — what dimensions does it use?
- 3d/src/components/OverviewScene.tsx — how many rows/cols per block?

Then in a new SQL migration (V8):
- For each block (B1, B2, C1, C2, A1, A2, D1, D2):
    - Count how many slots are currently in DB
    - Add slots until total matches the visual grid size (e.g. if scene shows
      4 rows x 4 cols x 3 tiers = 48 slots, add the missing ones)
- Keep existing slot IDs unchanged, only INSERT new ones

After this: B2 with 1 container out of 48 slots = 2%, grid looks correct

--- OPTION B: Fix 3D scene to render only real slots ---
Make the 3D scene draw exactly as many positions as backend has slots.

If B2 has 2 slots (rowNo=1/bayNo=1 and rowNo=1/bayNo=2):
- Scene should only render a 1x2 grid, not a 4x8 grid
- Empty visual positions that have no backend slot should not be drawn

This requires changing slotGridAdapter.ts and the scene grid renderer.

--- RECOMMENDATION ---
Option A is simpler and safer. The visual design was built for a certain
grid size — changing it (Option B) risks breaking the 3D layout.

Go with Option A: add enough slots in SQL so each block has slots matching
what the scene renders visually.

First tell me: read slotGridAdapter.ts and find what grid size (rows x cols
x tiers) the scene expects per block. Then add that many slots per block in SQL.