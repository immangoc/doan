# Warehouse Optimization Dataset Schema

## 1. Objective
Train a learning-to-rank model that scores candidate slots for a container while respecting hard constraints from warehouse rules.

## 2. Tables / DataFrames

### 2.1 `containers`
One row per container.

| column | type | description |
|---|---|---|
| container_id | string | Unique container identifier |
| company_id | string | Shipping company / customer group |
| cargo_type | category | Cargo type (dry, cold, fragile, hazard, damaged, etc.) |
| export_date | date | Planned departure date |
| import_date | date | Arrival date |
| weight_kg | float | Gross weight in kilograms |
| size_type | category | `20ft` or `40ft` |
| status | category | Current operational status |
| priority_level | int | Business priority / urgency |
| is_damaged | bool | Damaged container flag |
| special_handling | bool | Special handling required |
| warehouse_type_required | category | Required warehouse type |

### 2.2 `slots`
One row per physical slot.

| column | type | description |
|---|---|---|
| slot_id | string | Unique slot identifier |
| warehouse_id | int | Warehouse index |
| zone_id | int | Zone index |
| floor_no | int | Floor / tier number |
| position_no | int | Slot position inside the floor |
| slot_type | category | `20ft`, `40ft`, or `mixed_20_pair` |
| allowed_size_type | category | Allowed container size |
| allowed_cargo_type | category | Allowed cargo type |
| max_weight_kg | float | Weight threshold for the slot/stack |
| current_occupancy | int | Number of containers already placed |
| stack_height | int | Current height |
| is_locked | bool | Locked / unavailable |
| distance_to_exit | float | Distance to gate / exit |
| distance_to_gate | float | Optional gate distance |
| is_reserved | bool | Reserved for upcoming departure |
| is_temporary_buffer | bool | Temporary relocation buffer |
| is_cold_warehouse | bool | Cold warehouse flag |
| is_damaged_warehouse | bool | Damaged cargo warehouse flag |

### 2.3 `yard_state`
One row per container-slot candidate pair.

| column | type | description |
|---|---|---|
| container_id | string | Container under consideration |
| slot_id | string | Candidate slot |
| company_match | int | 1 if same company cluster, else 0 |
| export_urgency_days | int | Days until export (smaller is more urgent) |
| weight_fit | float | How well container weight fits slot |
| accessibility | float | Ease of retrieval |
| move_reduction | float | Estimated reduction in future moves |
| zone_compatibility | float | Compatibility between container and warehouse type |
| blocking_risk | float | Risk of blocking future departure |
| hard_valid | int | 1 if slot passes hard constraints, else 0 |
| score | float | Target ranking score |
| label | int | Rank label / relevance label |

## 3. Training format

For ranking, group samples by `container_id`.
Each group contains many candidate slots.

Suggested target:
- `label = 1` for the best historical slot
- or use `score` as a regression target for pairwise ranking

Suggested model:
- LightGBM Ranker
- XGBoost Ranker

## 4. Hard rules
- Wrong warehouse type -> invalid
- Wrong size type -> invalid
- Weight exceeds limit -> invalid
- Slot locked -> invalid
- Slot blocked for soon-to-depart containers -> invalid
- 40ft only for designed 40ft slots
- 20ft may use 20ft slots or paired 40ft slots if allowed
