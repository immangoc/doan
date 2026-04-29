# Warehouse ML Placement Service

## Run

```bash
pip install -r ml_service_requirements.txt
uvicorn ml_service_app:app --reload --host 0.0.0.0 --port 8000
```

## Files expected

Place the trained artifacts in the same directory as `ml_service_app.py`:

- `warehouse_ranker_lgbm.txt`
- `warehouse_ranker_meta.joblib`

If the files are not present, the service falls back to heuristic scoring.

## Endpoints

### GET /health
Returns model load status.

### POST /recommend-placement
Request example:

```json
{
  "containerId": "C000001",
  "cargoTypeName": "dry",
  "grossWeight": 18000,
  "sizeType": "20ft",
  "companyName": "A Logistics",
  "exportDate": "2026-04-30",
  "warehouseTypeRequired": "dry"
}
```

Response returns top-5 slot recommendations.
