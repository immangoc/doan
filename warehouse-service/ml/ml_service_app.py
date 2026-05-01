from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional, Union, List, Dict

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    import lightgbm as lgb  # type: ignore
except Exception:  # pragma: no cover
    lgb = None

try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except ImportError:  # pragma: no cover
    pass

import ml_db_repository as db_repo

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = logging.getLogger("ml_service")

USE_DB_SLOTS = os.getenv("ML_USE_DB_SLOTS", "true").lower() not in ("false", "0", "no")
DB_AVAILABLE = False  # set during startup probe

APP_DIR = Path(__file__).resolve().parent
MODEL_PATH = APP_DIR / "warehouse_ranker_lgbm.txt"
META_PATH = APP_DIR / "warehouse_ranker_meta.joblib"

app = FastAPI(
    title="Warehouse ML Placement Service",
    version="1.0.0",
    description="Microservice ML cho hệ thống quản lý kho bãi — Hùng Thủy Maritime.\n\n"
                "Sử dụng model LightGBM Ranker để gợi ý vị trí tối ưu cho container.",
    openapi_tags=[
        {"name": "Health", "description": "Kiểm tra trạng thái service"},
        {"name": "Model", "description": "Thông tin model ML và feature importance"},
        {"name": "Reference", "description": "Dữ liệu tham chiếu (loại hàng, loại kho)"},
        {"name": "Slots", "description": "Quản lý và thống kê slot kho"},
        {"name": "Placement", "description": "Gợi ý vị trí lưu container"},
    ],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL: Any = None
META: Dict[str, Any] = {}
FEATURE_COLUMNS: List[str] = []
LABEL_GAIN = [0, 1, 3, 7]

CARGO_TO_YARD = {
    # Canonical EN keys (4 cargo categories).
    "dry": "dry",
    "cold": "cold",
    "fragile": "fragile",
    "other": "other",
    # Vietnamese seed names from data.sql (lowercase, accent-stripped).
    "hang kho": "dry",
    "hang lanh": "cold",
    "hang de vo": "fragile",
    "hang khac": "other",
    # Legacy alias — "Hàng Nguy Hiểm" is treated as "Hàng Khác".
    "hang nguy hiem": "other",
}


def _strip_accents(text: str) -> str:
    import unicodedata
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn").replace("đ", "d").replace("Đ", "D")


def normalize_cargo_key(raw: str) -> str:
    return _strip_accents(raw or "").lower().strip()


def _safe_int(value: Any, default: int = 0) -> int:
    """Parse anything to int, coercing None/NaN/blank to the default."""
    if value is None:
        return default
    try:
        if isinstance(value, float) and pd.isna(value):
            return default
    except Exception:
        pass
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    try:
        if isinstance(value, float) and pd.isna(value):
            return None
    except Exception:
        pass
    s = str(value).strip()
    return s or None


def normalize_size_type(raw: Optional[str]) -> str:
    compact = (raw or "").lower().replace(" ", "")
    if compact.startswith("20"):
        return "20ft"
    if compact.startswith("40"):
        return "40ft"
    return compact or "20ft"


WAREHOUSE_TYPES = ["dry", "cold", "fragile", "other"]
COMPANIES = ["A Logistics", "B Shipping", "C Trade", "D Cargo", "E Global"]


class PlacementRequest(BaseModel):
    containerId: Optional[str] = None
    cargoTypeName: Optional[str] = None
    grossWeight: Optional[float] = Field(default=None, ge=0)
    sizeType: Optional[str] = None
    companyName: Optional[str] = None
    exportDate: Optional[str] = None
    warehouseTypeRequired: Optional[str] = None


class SlotRecommendation(BaseModel):
    slotId: str
    rowNo: int
    bayNo: int
    recommendedTier: int
    blockName: str
    zoneName: str
    yardName: str
    finalScore: float
    mlScore: Optional[float] = None
    movesNorm: Optional[float] = None
    exitNorm: Optional[float] = None
    futureBlockNorm: Optional[float] = None
    relocationsEstimated: Optional[int] = None


class PlacementResponse(BaseModel):
    containerId: Optional[str] = None
    cargoTypeName: str
    resolvedYardType: str
    recommendations: List[SlotRecommendation]
    totalCandidatesEvaluated: int
    computationTimeMs: int
    modelName: str


def load_artifacts() -> None:
    global MODEL, META, FEATURE_COLUMNS, LABEL_GAIN

    if MODEL_PATH.exists() and META_PATH.exists():
        META = joblib.load(META_PATH)
        FEATURE_COLUMNS = list(META.get("feature_columns", []))
        LABEL_GAIN = list(META.get("label_gain", LABEL_GAIN))

        if lgb is None:
            raise RuntimeError("lightgbm is not installed in the ML service environment")

        booster = lgb.Booster(model_file=str(MODEL_PATH))
        MODEL = booster
    else:
        MODEL = None
        META = {}
        FEATURE_COLUMNS = []


@app.on_event("startup")
def on_startup() -> None:
    load_artifacts()
    _probe_database()


@app.on_event("shutdown")
def on_shutdown() -> None:
    db_repo.close_pool()


def _probe_database() -> None:
    """Attempt a connection at startup. Logs but never crashes."""
    global DB_AVAILABLE
    if not USE_DB_SLOTS:
        log.info("DB-backed slots disabled via ML_USE_DB_SLOTS=false — using synthetic slots")
        DB_AVAILABLE = False
        return
    try:
        db_repo.init_pool()
        DB_AVAILABLE = True
        log.info("Postgres connection OK — ML service will query real slots")
    except db_repo.DbUnavailable as ex:
        DB_AVAILABLE = False
        log.warning("Postgres unavailable (%s) — falling back to synthetic slots", ex)


@app.get("/health", tags=["Health"])
def health() -> Dict[str, Any]:
    """Kiểm tra trạng thái ML service, model, và nguồn dữ liệu slot."""
    return {
        "status": "ok",
        "modelLoaded": MODEL is not None,
        "modelPath": str(MODEL_PATH),
        "metaPath": str(META_PATH),
        "slotSource": "postgres" if DB_AVAILABLE else "synthetic",
    }


def resolve_yard_type(cargo_type_name: str) -> str:
    yard_type = CARGO_TO_YARD.get(normalize_cargo_key(cargo_type_name))
    if not yard_type:
        raise HTTPException(status_code=400, detail=f"Unknown cargo type: {cargo_type_name}")
    return yard_type


def load_slots(yard_type_name: str) -> pd.DataFrame:
    """Return a DataFrame of candidate slots — from Postgres if available, else synthetic."""
    if DB_AVAILABLE:
        try:
            df = db_repo.fetch_slots(yard_type_name)
            if not df.empty:
                # Cast slot_id to string for stable downstream handling.
                df["slot_id"] = df["slot_id"].astype(str)
                return df
            log.warning("No slots returned from DB for yard type %s — using synthetic data", yard_type_name)
        except db_repo.DbUnavailable as ex:
            log.warning("DB slot fetch failed (%s) — falling back to synthetic slots", ex)
    return _synthetic_slots(yard_type_name)


def _synthetic_slots(yard_type_name: str) -> pd.DataFrame:
    rows = []
    slot_id = 1
    for warehouse_id in range(1, 5):
        warehouse_type = WAREHOUSE_TYPES[(warehouse_id - 1) % len(WAREHOUSE_TYPES)]
        if warehouse_type != yard_type_name:
            continue
        for zone_id in range(1, 4):
            for floor_no in range(1, 5):
                for pos in range(1, 17):
                    rows.append(
                        {
                            "slot_id": f"S{slot_id:05d}",
                            "warehouse_id": warehouse_id,
                            "zone_id": zone_id,
                            "floor_no": floor_no,
                            "position_no": pos,
                            "slot_type": "20ft",
                            "allowed_cargo_type": warehouse_type,
                            "allowed_size_type": "20ft",
                            "max_weight_kg": int(28000 + (4 - floor_no) * 5000 + np.random.randint(-1000, 1000)),
                            "current_occupancy": int(np.random.randint(0, 2)),
                            "stack_height": int(np.random.randint(0, floor_no + 1)),
                            "is_locked": bool(np.random.rand() < 0.03),
                            "distance_to_exit": int(np.random.randint(1, 100)),
                            "is_reserved": bool(np.random.rand() < 0.05),
                            "is_temporary_buffer": False,
                            "is_cold_warehouse": warehouse_type == "cold",
                            "is_damaged_warehouse": warehouse_type == "fragile",
                            "is_40ft_designated": False,
                        }
                    )
                    slot_id += 1
                for pos in range(1, 9):
                    rows.append(
                        {
                            "slot_id": f"S{slot_id:05d}",
                            "warehouse_id": warehouse_id,
                            "zone_id": zone_id,
                            "floor_no": floor_no,
                            "position_no": pos,
                            "slot_type": "40ft",
                            "allowed_cargo_type": warehouse_type,
                            "allowed_size_type": "40ft",
                            "max_weight_kg": int(32000 + (4 - floor_no) * 6000 + np.random.randint(-1000, 1000)),
                            "current_occupancy": int(np.random.randint(0, 2)),
                            "stack_height": int(np.random.randint(0, floor_no + 1)),
                            "is_locked": bool(np.random.rand() < 0.03),
                            "distance_to_exit": int(np.random.randint(1, 100)),
                            "is_reserved": bool(np.random.rand() < 0.05),
                            "is_temporary_buffer": False,
                            "is_cold_warehouse": warehouse_type == "cold",
                            "is_damaged_warehouse": warehouse_type == "fragile",
                            "is_40ft_designated": True,
                        }
                    )
                    slot_id += 1
    return pd.DataFrame(rows)


def is_valid_slot(container: Dict[str, Any], slot: pd.Series) -> bool:
    if bool(slot["is_locked"]) or bool(slot["is_reserved"]):
        return False
    if container["cargo_type"] != slot["allowed_cargo_type"]:
        return False
    if container["size_type"] != slot["allowed_size_type"]:
        if not (
            container["size_type"] == "20ft"
            and slot["slot_type"] == "40ft"
            and bool(slot["is_40ft_designated"])
        ):
            return False
    if float(container["grossWeight"]) > float(slot["max_weight_kg"]):
        return False

    # ★ Check slot is not full — current_occupancy must be less than max capacity
    max_tier = _safe_int(slot.get("max_tier") if "max_tier" in slot.index else slot.get("floor_no"), 4)
    current_occ = _safe_int(slot.get("current_occupancy"), 0)
    if current_occ >= max_tier:
        return False

    return True


def build_features(container: Dict[str, Any], slot: pd.Series) -> Dict[str, Any]:
    export_date = container.get("exportDate")
    if export_date:
        try:
            export_days = max(0, (datetime.fromisoformat(export_date).date() - datetime.today().date()).days)
        except ValueError:
            export_days = 10
    else:
        export_days = 10

    company_name = container.get("companyName") or ""
    company_grouping = 1 if company_name and slot["zone_id"] == ((abs(hash(company_name)) % 3) + 1) else 0
    # company_cluster_score: finer-grained affinity based on name hash
    company_cluster_score = (abs(hash(company_name)) % 10) / 10.0 if company_name else 0.0

    gross_weight = float(container["grossWeight"])
    weight_fit = 1.0 - min(abs(gross_weight - float(slot["max_weight_kg"])) / max(float(slot["max_weight_kg"]), 1.0), 1.0)
    accessibility = 1.0 - min(float(slot["distance_to_exit"]) / 100.0, 1.0)
    move_reduction = 1.0 - min(float(slot["stack_height"]) / 4.0, 1.0)
    zone_compatibility = 1.0 if container["cargo_type"] == slot["allowed_cargo_type"] else 0.0
    blocked_risk = min((float(slot["stack_height"]) / 4.0) + (float(slot["current_occupancy"]) / 2.0), 1.0)
    occupancy_rate = min(float(slot["current_occupancy"]) / 2.0, 1.0)

    return {
        "warehouse_id": int(slot["warehouse_id"]),
        "zone_id": int(slot["zone_id"]),
        "floor_no": int(slot["floor_no"]),
        "position_no": int(slot["position_no"]),
        "slot_type_40ft": 1 if slot["slot_type"] == "40ft" else 0,
        "container_size_40ft": 1 if container["size_type"] == "40ft" else 0,
        "container_weight_kg": gross_weight,
        "container_priority": int(container.get("priorityLevel", 1)),
        "container_damaged": int(bool(container.get("isDamaged", False))),
        "export_urgency": export_days,
        "company_grouping": company_grouping,
        "weight_fit": weight_fit,
        "accessibility": accessibility,
        "move_reduction": move_reduction,
        "zone_compatibility": zone_compatibility,
        "occupancy_rate": occupancy_rate,
        "blocked_risk": blocked_risk,
        "company_cluster_score": company_cluster_score,
    }


def score_features(feat: Dict[str, Any]) -> float:
    return (
        0.28 * feat["export_urgency"] * -1.0
        + 0.12 * feat["company_grouping"]
        + 0.18 * feat["weight_fit"]
        + 0.14 * feat["accessibility"]
        + 0.12 * feat["move_reduction"]
        + 0.10 * feat["zone_compatibility"]
        - 0.16 * feat["blocked_risk"]
    )


def heuristic_label(score: float, best: float, p75: float, p50: float) -> int:
    if score >= best - 1e-9:
        return 3
    if score >= p75:
        return 2
    if score >= p50:
        return 1
    return 0


@app.get("/model-info", tags=["Model"])
def model_info() -> Dict[str, Any]:
    """Trả về thông tin chi tiết về model ML đang được sử dụng."""
    if MODEL is None:
        return {
            "modelLoaded": False,
            "modelName": "Heuristic Fallback",
            "description": "Không tìm thấy model LightGBM. Hệ thống đang sử dụng thuật toán heuristic.",
        }
    return {
        "modelLoaded": True,
        "modelName": "LightGBM Ranker",
        "modelPath": str(MODEL_PATH),
        "featureColumns": FEATURE_COLUMNS,
        "featureCount": len(FEATURE_COLUMNS),
        "labelGain": LABEL_GAIN,
        "trainingNdcg5": META.get("ndcg5"),
        "weights": META.get("weights"),
        "numTrees": MODEL.num_trees() if hasattr(MODEL, "num_trees") else None,
    }


@app.get("/feature-importance", tags=["Model"])
def feature_importance() -> Dict[str, Any]:
    """Trả về mức độ quan trọng (importance) của từng feature trong model."""
    if MODEL is None:
        return {"modelLoaded": False, "features": []}
    importances = MODEL.feature_importance(importance_type="gain").tolist()
    names = MODEL.feature_name()
    pairs = sorted(zip(names, importances), key=lambda x: x[1], reverse=True)
    return {
        "modelLoaded": True,
        "importanceType": "gain",
        "features": [{"name": n, "importance": round(v, 4)} for n, v in pairs],
    }


@app.get("/cargo-types", tags=["Reference"])
def list_cargo_types() -> Dict[str, Any]:
    """Trả về danh sách loại hàng hóa được hỗ trợ và mapping sang loại kho."""
    mappings = []
    seen = set()
    for key, yard in CARGO_TO_YARD.items():
        if key not in seen:
            mappings.append({"cargoKey": key, "resolvedYardType": yard})
            seen.add(key)
    return {
        "totalCargoTypes": len(mappings),
        "warehouseTypes": WAREHOUSE_TYPES,
        "mappings": mappings,
    }


@app.get("/slots/{yard_type}", tags=["Slots"])
def get_slots(yard_type: str) -> Dict[str, Any]:
    """Lấy danh sách các slot khả dụng theo loại kho (dry, cold, fragile, other)."""
    yard_type_lower = yard_type.lower().strip()
    if yard_type_lower not in WAREHOUSE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid yard type: {yard_type}. Must be one of: {WAREHOUSE_TYPES}")
    df = load_slots(yard_type_lower)
    total = len(df)
    available = int((~df["is_locked"].astype(bool) & ~df["is_reserved"].astype(bool)).sum()) if total > 0 else 0
    occupied = int(df["current_occupancy"].astype(int).gt(0).sum()) if total > 0 else 0
    return {
        "yardType": yard_type_lower,
        "totalSlots": total,
        "availableSlots": available,
        "occupiedSlots": occupied,
        "slotSource": "postgres" if DB_AVAILABLE else "synthetic",
        "slots": df.head(50).to_dict(orient="records"),
    }


@app.get("/slot-stats", tags=["Slots"])
def slot_stats() -> Dict[str, Any]:
    """Thống kê tổng quan slot trên tất cả các loại kho."""
    stats = []
    for wt in WAREHOUSE_TYPES:
        df = load_slots(wt)
        total = len(df)
        if total == 0:
            stats.append({"yardType": wt, "totalSlots": 0, "availableSlots": 0, "occupiedSlots": 0, "occupancyRate": 0.0})
            continue
        available = int((~df["is_locked"].astype(bool) & ~df["is_reserved"].astype(bool)).sum())
        occupied = int(df["current_occupancy"].astype(int).gt(0).sum())
        stats.append({
            "yardType": wt,
            "totalSlots": total,
            "availableSlots": available,
            "occupiedSlots": occupied,
            "occupancyRate": round(occupied / total, 4) if total > 0 else 0.0,
        })
    return {
        "slotSource": "postgres" if DB_AVAILABLE else "synthetic",
        "warehouseStats": stats,
        "grandTotal": sum(s["totalSlots"] for s in stats),
        "grandAvailable": sum(s["availableSlots"] for s in stats),
    }


class BatchPlacementRequest(BaseModel):
    containers: List[PlacementRequest]


@app.post("/batch-recommend", tags=["Placement"])
def batch_recommend(request: BatchPlacementRequest) -> Dict[str, Any]:
    """Gợi ý vị trí cho nhiều container cùng lúc (batch)."""
    if not request.containers:
        raise HTTPException(status_code=400, detail="containers list must not be empty")
    if len(request.containers) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 containers per batch")

    results = []
    errors = []
    for i, container_req in enumerate(request.containers):
        try:
            result = recommend_placement(container_req)
            results.append({
                "index": i,
                "containerId": container_req.containerId,
                "status": "ok",
                "recommendation": result.model_dump(),
            })
        except HTTPException as ex:
            errors.append({
                "index": i,
                "containerId": container_req.containerId,
                "status": "error",
                "detail": ex.detail,
            })
    return {
        "totalRequested": len(request.containers),
        "totalSuccess": len(results),
        "totalErrors": len(errors),
        "results": results,
        "errors": errors,
    }


@app.get("/recommend-placement", tags=["Placement"])
def recommend_placement_info() -> Dict[str, Any]:
    """Hướng dẫn sử dụng API gợi ý vị trí (sử dụng POST method)."""
    return {
        "message": "Use POST method to get placement recommendations",
        "example_request": {
            "containerId": "C000001",
            "cargoTypeName": "dry",
            "grossWeight": 18000,
            "sizeType": "20ft",
            "companyName": "A Logistics",
            "exportDate": "2026-04-30",
            "warehouseTypeRequired": "dry",
        },
        "docs_url": "/docs",
    }


@app.post("/recommend-placement", response_model=PlacementResponse, tags=["Placement"])
def recommend_placement(request: PlacementRequest) -> PlacementResponse:
    """Gợi ý Top-5 vị trí slot tối ưu cho một container dựa trên model LightGBM."""
    if not request.cargoTypeName:
        raise HTTPException(status_code=400, detail="cargoTypeName is required")
    if request.grossWeight is None:
        raise HTTPException(status_code=400, detail="grossWeight is required")
    if not request.sizeType:
        raise HTTPException(status_code=400, detail="sizeType is required")

    started = datetime.utcnow()
    resolved_yard_type = resolve_yard_type(request.cargoTypeName)
    cargo_type = resolved_yard_type
    size_type = normalize_size_type(request.sizeType)

    slots_df = load_slots(resolved_yard_type)
    container = request.model_dump()
    container["cargo_type"] = cargo_type
    container["size_type"] = size_type
    container["grossWeight"] = float(request.grossWeight)
    container["isDamaged"] = False
    container["priorityLevel"] = 1

    candidates = []
    for _, slot in slots_df.iterrows():
        if not is_valid_slot(container, slot):
            continue
        feat = build_features(container, slot)
        candidates.append((slot, feat, score_features(feat)))

    if not candidates:
        raise HTTPException(status_code=422, detail="No valid candidate slots found")

    scores = [x[2] for x in candidates]
    best = max(scores)
    p75 = float(np.percentile(scores, 75))
    p50 = float(np.percentile(scores, 50))

    rows = []
    for slot, feat, heuristic_score in candidates:
        feature_row = pd.DataFrame([feat])
        if MODEL is not None and FEATURE_COLUMNS:
            pred_score = float(MODEL.predict(feature_row[FEATURE_COLUMNS])[0])
        else:
            pred_score = float(heuristic_score)

        label = heuristic_label(heuristic_score, best, p75, p50)
        row_no = _safe_int(slot.get("row_no") if "row_no" in slot else slot.get("position_no"))
        bay_no = _safe_int(slot.get("bay_no") if "bay_no" in slot else slot.get("position_no"))
        block_name = _safe_str(slot.get("block_name") if "block_name" in slot else None) \
                     or f"Block-{_safe_int(slot.get('zone_id'))}"
        zone_name = _safe_str(slot.get("zone_name") if "zone_name" in slot else None) \
                    or f"Zone-{_safe_int(slot.get('zone_id'))}"
        yard_name = _safe_str(slot.get("yard_name") if "yard_name" in slot else None) \
                    or f"Warehouse-{_safe_int(slot.get('warehouse_id'))}"
        rows.append(
            {
                "slotId": str(slot["slot_id"]),
                "rowNo": row_no,
                "bayNo": bay_no,
                "recommendedTier": min(int(slot["current_occupancy"]) + 1,
                                       _safe_int(slot.get("max_tier") if "max_tier" in slot.index else slot.get("floor_no"), 4)),
                "blockName": block_name,
                "zoneName": zone_name,
                "yardName": yard_name,
                "finalScore": round(pred_score, 6),
                "mlScore": round(pred_score, 6),
                "movesNorm": round(1.0 - feat["move_reduction"], 6),
                "exitNorm": round(1.0 - feat["accessibility"], 6),
                "futureBlockNorm": round(feat["blocked_risk"], 6),
                "relocationsEstimated": int(max(0, round(feat["blocked_risk"] * 3))),
                "_label": label,
            }
        )

    rows.sort(key=lambda x: x["finalScore"], reverse=True)
    top_rows = rows[:5]
    elapsed_ms = int((datetime.utcnow() - started).total_seconds() * 1000)

    recommendations = [SlotRecommendation(**{k: v for k, v in row.items() if k != "_label"}) for row in top_rows]

    return PlacementResponse(
        containerId=request.containerId,
        cargoTypeName=cargo_type,
        resolvedYardType=resolved_yard_type,
        recommendations=recommendations,
        totalCandidatesEvaluated=len(rows),
        computationTimeMs=elapsed_ms,
        modelName="LightGBM Ranker" if MODEL is not None else "Heuristic Fallback",
    )