SET client_encoding = 'UTF8';

-- The correct capacity for each zone physically generated in the frontend 
-- (16 x 20ft + 8 x 40ft) * 4 floors = 96 container positions.
-- This ensures the backend response matches the physical grid capacity.
UPDATE yard_zones SET capacity_slots = 96;
