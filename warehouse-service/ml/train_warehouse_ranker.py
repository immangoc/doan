import math
import random
from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np
import pandas as pd
from lightgbm import LGBMRanker
from sklearn.model_selection import train_test_split
from sklearn.metrics import ndcg_score


RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

WAREHOUSE_COUNT = 4
ZONES_PER_WAREHOUSE = 3
FLOORS_PER_ZONE = 4
SLOTS_20_PER_FLOOR = 16
SLOTS_40_PER_FLOOR = 8

CARGO_TYPES = ["dry", "cold", "fragile", "other"]
COMPANIES = ["A", "B", "C", "D", "E", "F", "G", "H"]
STATUSES = ["new", "waiting", "stored", "priority", "blocked"]
SIZE_TYPES = ["20ft", "40ft"]

WAREHOUSE_CARGO_MAP = {
    "dry": [0],
    "cold": [2],
    "fragile": [1],
    "other": [3],
}

WAREHOUSE_NAMES = {
    0: "dry",
    1: "fragile",
    2: "cold",
    3: "other",
}


@dataclass
class Container:
    container_id: str
    company_id: str
    cargo_type: str
    export_date: date
    import_date: date
    weight_kg: float
    size_type: str
    status: str
    priority_level: int
    is_damaged: bool
    special_handling: bool
    warehouse_type_required: str


@dataclass
class Slot:
    slot_id: str
    warehouse_id: int
    zone_id: int
    floor_no: int
    position_no: int
    slot_type: str
    allowed_size_type: str
    allowed_cargo_type: str
    max_weight_kg: float
    current_occupancy: int
    stack_height: int
    is_locked: bool
    distance_to_exit: float
    distance_to_gate: float
    is_reserved: bool
    is_temporary_buffer: bool
    is_cold_warehouse: bool
    is_damaged_warehouse: bool


def generate_slots():
    rows = []
    for w in range(WAREHOUSE_COUNT):
        for z in range(ZONES_PER_WAREHOUSE):
            for f in range(FLOORS_PER_ZONE):
                for p in range(SLOTS_20_PER_FLOOR):
                    rows.append({
                        "slot_id": f"W{w+1}_Z{z+1}_F{f+1}_20_{p+1}",
                        "warehouse_id": w,
                        "zone_id": z,
                        "floor_no": f + 1,
                        "position_no": p + 1,
                        "slot_type": "20ft",
                        "allowed_size_type": "20ft",
                        "allowed_cargo_type": WAREHOUSE_NAMES[w],
                        "max_weight_kg": 28000 + f * 2000,
                        "current_occupancy": np.random.randint(0, 3),
                        "stack_height": np.random.randint(0, 4),
                        "is_locked": np.random.rand() < 0.05,
                        "distance_to_exit": float((f + 1) * 10 + p),
                        "distance_to_gate": float((z + 1) * 15 + p),
                        "is_reserved": np.random.rand() < 0.08,
                        "is_temporary_buffer": np.random.rand() < 0.03,
                        "is_cold_warehouse": w == 2,
                        "is_damaged_warehouse": w == 1,
                    })
                for p in range(SLOTS_40_PER_FLOOR):
                    rows.append({
                        "slot_id": f"W{w+1}_Z{z+1}_F{f+1}_40_{p+1}",
                        "warehouse_id": w,
                        "zone_id": z,
                        "floor_no": f + 1,
                        "position_no": p + 1,
                        "slot_type": "40ft",
                        "allowed_size_type": "40ft",
                        "allowed_cargo_type": WAREHOUSE_NAMES[w],
                        "max_weight_kg": 35000 + f * 3000,
                        "current_occupancy": np.random.randint(0, 3),
                        "stack_height": np.random.randint(0, 4),
                        "is_locked": np.random.rand() < 0.05,
                        "distance_to_exit": float((f + 1) * 12 + p),
                        "distance_to_gate": float((z + 1) * 18 + p),
                        "is_reserved": np.random.rand() < 0.08,
                        "is_temporary_buffer": np.random.rand() < 0.03,
                        "is_cold_warehouse": w == 2,
                        "is_damaged_warehouse": w == 1,
                    })
    return pd.DataFrame(rows)


def generate_containers(n=800):
    rows = []
    base_date = date.today()
    for i in range(n):
        cargo = random.choice(CARGO_TYPES)
        size = random.choices(SIZE_TYPES, weights=[0.72, 0.28])[0]
        import_dt = base_date - timedelta(days=random.randint(0, 30))
        export_dt = base_date + timedelta(days=random.randint(1, 45))
        warehouse_req = cargo  # 1:1 cargo ↔ yard type for the 4 canonical kinds
        rows.append({
            "container_id": f"C{i+1:05d}",
            "company_id": random.choice(COMPANIES),
            "cargo_type": cargo,
            "export_date": export_dt,
            "import_date": import_dt,
            "weight_kg": float(np.clip(np.random.normal(22000 if size == "40ft" else 18000, 4500), 3000, 36000)),
            "size_type": size,
            "status": random.choice(STATUSES),
            "priority_level": random.randint(1, 5),
            "is_damaged": False,  # damaged containers bypass placement optimization
            "special_handling": cargo in {"cold", "fragile"},
            "warehouse_type_required": warehouse_req,
        })
    return pd.DataFrame(rows)


def hard_valid(container_row, slot_row):
    if slot_row["is_locked"]:
        return 0
    if container_row["size_type"] != slot_row["allowed_size_type"]:
        return 0
    if container_row["cargo_type"] != slot_row["allowed_cargo_type"]:
        return 0
    if container_row["weight_kg"] > slot_row["max_weight_kg"]:
        return 0
    if container_row["cargo_type"] == "cold" and not slot_row["is_cold_warehouse"]:
        return 0
    return 1


def company_match_score(container_row, slot_row):
    # synthetic clustering by deterministic company hash and zone
    c_hash = sum(ord(ch) for ch in container_row["company_id"])
    return 1 if (c_hash + slot_row["warehouse_id"] + slot_row["zone_id"]) % 3 == 0 else 0


def compute_features(containers_df, slots_df):
    rows = []
    for _, c in containers_df.iterrows():
        export_urgency_days = max((c["export_date"] - date.today()).days, 0)
        for _, s in slots_df.iterrows():
            hv = hard_valid(c, s)
            if c["size_type"] == "20ft" and s["slot_type"] == "40ft":
                size_bonus = 0.15
            else:
                size_bonus = 0.0
            weight_fit = 1.0 - min(abs(c["weight_kg"] - s["max_weight_kg"]) / max(s["max_weight_kg"], 1.0), 1.0)
            accessibility = 1.0 / (1.0 + s["distance_to_exit"])
            move_reduction = 1.0 / (1.0 + s["stack_height"])
            zone_compatibility = 1.0 if c["warehouse_type_required"] == s["allowed_cargo_type"] else 0.0
            blocking_risk = 1.0 if (s["floor_no"] >= 3 and export_urgency_days <= 2) else 0.0
            company_match = company_match_score(c, s)
            score = (
                2.0 * (1.0 / (1.0 + export_urgency_days))
                + 0.8 * company_match
                + 1.2 * weight_fit
                + 1.5 * accessibility
                + 1.0 * move_reduction
                + 1.0 * zone_compatibility
                + 0.5 * size_bonus
                - 2.5 * blocking_risk
            )
            if hv == 0:
                score = -10.0
            rows.append({
                "container_id": c["container_id"],
                "slot_id": s["slot_id"],
                "company_match": company_match,
                "export_urgency_days": export_urgency_days,
                "weight_fit": weight_fit,
                "accessibility": accessibility,
                "move_reduction": move_reduction,
                "zone_compatibility": zone_compatibility,
                "blocking_risk": blocking_risk,
                "hard_valid": hv,
                "score": score,
            })
    return pd.DataFrame(rows)


def create_labels(df):
    df = df.copy()
    df["label"] = 0
    for cid, g in df.groupby("container_id"):
        valid = g[g["hard_valid"] == 1].sort_values("score", ascending=False)
        if not valid.empty:
            best_idx = valid.index[0]
            df.loc[best_idx, "label"] = 1
    return df


def train_ranker(df):
    feature_cols = [
        "company_match",
        "export_urgency_days",
        "weight_fit",
        "accessibility",
        "move_reduction",
        "zone_compatibility",
        "blocking_risk",
        "hard_valid",
    ]

    df = df.sort_values(["container_id", "score"], ascending=[True, False]).reset_index(drop=True)
    grouped = df.groupby("container_id").size().to_list()

    X = df[feature_cols]
    y = df["label"]
    group = grouped

    # Split by container_id to avoid leakage
    container_ids = df["container_id"].unique()
    train_ids, test_ids = train_test_split(container_ids, test_size=0.2, random_state=RANDOM_SEED)
    train_df = df[df["container_id"].isin(train_ids)].copy()
    test_df = df[df["container_id"].isin(test_ids)].copy()

    train_group = train_df.groupby("container_id").size().to_list()
    test_group = test_df.groupby("container_id").size().to_list()

    model = LGBMRanker(
        objective="lambdarank",
        metric="ndcg",
        n_estimators=300,
        learning_rate=0.05,
        num_leaves=31,
        random_state=RANDOM_SEED,
    )

    model.fit(
        train_df[feature_cols],
        train_df["label"],
        group=train_group,
        eval_set=[(test_df[feature_cols], test_df["label"])],
        eval_group=[test_group],
        eval_at=[1, 3, 5],
        verbose=False,
    )

    pred = model.predict(test_df[feature_cols])
    test_df = test_df.copy()
    test_df["pred"] = pred

    # NDCG@5 by container group
    ndcgs = []
    for _, g in test_df.groupby("container_id"):
        true = np.asarray([g["label"].to_list()])
        pred_arr = np.asarray([g["pred"].to_list()])
        ndcgs.append(ndcg_score(true, pred_arr, k=5))

    print(f"Test containers: {test_df['container_id'].nunique()}")
    print(f"Mean NDCG@5: {np.mean(ndcgs):.4f}")
    print("Feature importance:")
    for name, imp in sorted(zip(feature_cols, model.feature_importances_), key=lambda x: x[1], reverse=True):
        print(f"  {name}: {imp}")

    return model, feature_cols, train_df, test_df


if __name__ == "__main__":
    slots_df = generate_slots()
    containers_df = generate_containers(n=600)
    samples_df = compute_features(containers_df, slots_df)
    samples_df = create_labels(samples_df)

    print("Containers:", containers_df.shape)
    print("Slots:", slots_df.shape)
    print("Samples:", samples_df.shape)
    print("Hard valid rate:", samples_df["hard_valid"].mean())

    model, feature_cols, train_df, test_df = train_ranker(samples_df)

    # Example recommendation for one container
    example_container = test_df.iloc[0]["container_id"]
    ex = test_df[test_df["container_id"] == example_container].copy()
    ex["pred"] = model.predict(ex[feature_cols])
    top5 = ex.sort_values("pred", ascending=False).head(5)[["container_id", "slot_id", "pred", "score", "label"]]
    print("\nTop-5 recommendations for", example_container)
    print(top5.to_string(index=False))
