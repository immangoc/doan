"""
Postgres repository for the ML placement service.

Reads real warehouse slots from the same database used by the Spring Boot
backend (warehouse-service). Connection parameters are read from environment
variables, with defaults matching the Spring Boot `application.yml`.

If the database is unreachable (missing driver, wrong credentials, network
error), the repository raises `DbUnavailable` so the service can fall back
to synthetic slot generation during local development.
"""
from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from typing import Optional
from urllib.parse import urlparse

import pandas as pd

log = logging.getLogger(__name__)

try:
    import psycopg2
    from psycopg2 import pool
except ImportError:  # pragma: no cover
    psycopg2 = None
    pool = None


class DbUnavailable(RuntimeError):
    """Raised when the Postgres connection cannot be established or used."""


# ---------------------------------------------------------------------------
# Connection setup

_POOL: Optional["pool.SimpleConnectionPool"] = None


def _parse_jdbc_url(jdbc_url: str) -> dict:
    """Convert a JDBC-style URL (jdbc:postgresql://host:port/db?opts) to libpq kwargs."""
    if jdbc_url.startswith("jdbc:"):
        jdbc_url = jdbc_url[len("jdbc:"):]
    parsed = urlparse(jdbc_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "dbname": (parsed.path or "/postgres").lstrip("/"),
    }


def _resolve_dsn() -> dict:
    """Build libpq connection kwargs from environment variables."""
    raw_url = os.getenv("DB_URL") or os.getenv("DATABASE_URL")
    if raw_url:
        dsn = _parse_jdbc_url(raw_url)
    else:
        dsn = {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": int(os.getenv("DB_PORT", "5432")),
            "dbname": os.getenv("DB_NAME", "portdb"),
        }
    dsn["user"] = os.getenv("DB_USER", "postgres")
    dsn["password"] = os.getenv("DB_PASSWORD", "postgres")
    dsn["connect_timeout"] = int(os.getenv("DB_CONNECT_TIMEOUT", "3"))
    return dsn


def init_pool(min_size: int = 1, max_size: int = 5) -> None:
    """Initialise a connection pool. Safe to call multiple times."""
    global _POOL
    if psycopg2 is None:
        raise DbUnavailable("psycopg2 is not installed; add psycopg2-binary to requirements")
    if _POOL is not None:
        return
    try:
        dsn = _resolve_dsn()
        _POOL = pool.SimpleConnectionPool(min_size, max_size, **dsn)
        log.info("Postgres pool ready (host=%s db=%s)", dsn["host"], dsn["dbname"])
    except Exception as ex:  # pragma: no cover — surfaces as DbUnavailable
        raise DbUnavailable(f"Cannot initialise Postgres pool: {ex}") from ex


def close_pool() -> None:
    global _POOL
    if _POOL is not None:
        _POOL.closeall()
        _POOL = None


@contextmanager
def _connection():
    if _POOL is None:
        init_pool()
    conn = _POOL.getconn()
    try:
        yield conn
    finally:
        _POOL.putconn(conn)


# ---------------------------------------------------------------------------
# Queries

_SLOT_QUERY = """
    SELECT
        s.slot_id,
        s.row_no,
        s.bay_no,
        s.max_tier,
        COALESCE(s.is_locked, FALSE)          AS is_locked,
        b.block_id,
        b.block_name,
        z.zone_id,
        z.zone_name,
        z.capacity_slots,
        y.yard_id,
        y.yard_name,
        yt.yard_type_name,
        (
            SELECT COUNT(*)
            FROM container_positions cp
            WHERE cp.slot_id = s.slot_id
        )                                     AS current_occupancy
    FROM slots s
    JOIN blocks      b  ON s.block_id     = b.block_id
    JOIN yard_zones  z  ON b.zone_id      = z.zone_id
    JOIN yards       y  ON z.yard_id      = y.yard_id
    JOIN yard_types  yt ON y.yard_type_id = yt.yard_type_id
    WHERE yt.yard_type_name = %s
      AND COALESCE(s.is_locked, FALSE) = FALSE
    ORDER BY y.yard_id, z.zone_id, b.block_id, s.row_no, s.bay_no
"""


def fetch_slots(yard_type_name: str) -> pd.DataFrame:
    """
    Return a DataFrame of real slots for the given yard type, with the same
    column schema the ML scoring code expects.
    """
    try:
        with _connection() as conn:
            rows = pd.read_sql(_SLOT_QUERY, conn, params=(yard_type_name,))
    except DbUnavailable:
        raise
    except Exception as ex:
        raise DbUnavailable(f"Slot query failed: {ex}") from ex

    if rows.empty:
        return rows

    # Map real DB columns onto the feature shape expected by the scorer.
    rows = rows.assign(
        warehouse_id=rows["yard_id"],
        floor_no=rows["max_tier"].fillna(4).astype(int),
        position_no=rows["bay_no"].fillna(1).astype(int),
        slot_type=rows["bay_no"].apply(_slot_type_for_bay),
        allowed_cargo_type=rows["yard_type_name"],
        allowed_size_type=rows["bay_no"].apply(_slot_type_for_bay),
        max_weight_kg=rows["max_tier"].apply(_default_max_weight),
        stack_height=rows["current_occupancy"].clip(lower=0),
        distance_to_exit=_estimate_distance_to_exit(rows),
        is_reserved=False,
        is_temporary_buffer=False,
        is_cold_warehouse=rows["yard_type_name"].eq("cold"),
        is_damaged_warehouse=rows["yard_type_name"].eq("fragile"),
        is_40ft_designated=rows["bay_no"].apply(_slot_type_for_bay).eq("40ft"),
    )
    return rows


def _slot_type_for_bay(bay_no: Optional[int]) -> str:
    """Heuristic: first 16 bays per row are 20ft, the rest 40ft."""
    if bay_no is None:
        return "20ft"
    return "40ft" if int(bay_no) > 16 else "20ft"


def _default_max_weight(max_tier: Optional[int]) -> int:
    """Default weight capacity scaled by max_tier (tier 1 supports most weight)."""
    mt = int(max_tier) if max_tier is not None else 4
    return 28000 + (5 - mt) * 5000


def _estimate_distance_to_exit(rows: pd.DataFrame) -> pd.Series:
    """
    Rough distance-to-exit proxy (1..100) using row/bay position.
    Lower is closer — slots at (row_no=1, bay_no=1) get score ~1.
    """
    row = rows["row_no"].fillna(0).astype(int)
    bay = rows["bay_no"].fillna(0).astype(int)
    raw = (row * 5 + bay).clip(lower=1, upper=100)
    return raw.astype(int)
