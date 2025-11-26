import csv
import json
import math
import os
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import httpx
import logging
from dotenv import load_dotenv
import pandas as pd

# Import geocoding utility
from .geocoding import geocode_location
from .sheet_data import fetch_raw_sheet_data

logger = logging.getLogger(__name__)

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_POINTS_DIR = PROJECT_ROOT / "data_points"
ALIAS_FILE = DATA_DIR / "product_aliases.json"

BENCHMARK_API_URL = os.getenv("BENCHMARK_API_URL")
BENCHMARK_API_KEY = os.getenv("BENCHMARK_API_KEY")
BENCHMARK_LOCATION_GROUPS = [
    "farm",
    "distribution-center",
    "local-shops",
    "sunday-market",
    "supermarket",
    "ecommerce",
    "chipchip",
]

BENCHMARK_CHUNK_DAYS = int(os.getenv("BENCHMARK_CHUNK_DAYS", "21"))
DEFAULT_LOCAL_WEIGHT = float(os.getenv("SENSITIVITY_LOCAL_WEIGHT", "0.6"))
DEFAULT_DISTRIBUTION_WEIGHT = float(os.getenv("SENSITIVITY_DISTRIBUTION_WEIGHT", "0.4"))

_BENCHMARK_CACHE: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}

SGL_DEAL_TYPES = (
    "SUPER_GROUP",
    "SUPER_GROUP_FLASH_SALE",
    "SUPER_GROUP_REGULAR",
    "SUPER_GROUP_RECURRENT",
)


@dataclass
class AliasRecord:
    canonical: str
    order_variants: List[str]
    benchmark_variants: List[str]
    distribution_variants: List[str]


def _parse_date(value: str) -> Optional[date]:
    if not value:
        return None
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        try:
            return datetime.strptime(value[:10], "%m/%d/%Y").date()
        except ValueError:
            return None


def _ensure_aliases() -> List[AliasRecord]:
    if not ALIAS_FILE.exists():
        raise RuntimeError(f"Product alias file not found at {ALIAS_FILE}")
    with ALIAS_FILE.open("r", encoding="utf-8") as f:
        entries = json.load(f)
    aliases: List[AliasRecord] = []
    for entry in entries:
        aliases.append(
            AliasRecord(
                canonical=entry["canonical"],
                order_variants=entry.get("order_variants") or [entry["canonical"]],
                benchmark_variants=entry.get("benchmark_variants") or entry.get("benchmark_name") or [entry["canonical"]],
                distribution_variants=entry.get("distribution_variants") or entry.get("distribution_name") or [entry["canonical"]],
            )
        )
    return aliases


def _build_alias_indexes(aliases: Iterable[AliasRecord]) -> Tuple[Dict[str, str], Dict[str, str], Dict[str, str]]:
    order_index: Dict[str, str] = {}
    benchmark_index: Dict[str, str] = {}
    distribution_index: Dict[str, str] = {}

    for alias in aliases:
        canonical = alias.canonical
        for variant in alias.order_variants + [canonical]:
            key = variant.strip().lower()
            if key and key not in order_index:
                order_index[key] = canonical
        for variant in alias.benchmark_variants + [canonical]:
            key = variant.strip().lower()
            if key and key not in benchmark_index:
                benchmark_index[key] = canonical
        for variant in alias.distribution_variants + [canonical]:
            key = variant.strip().lower()
            if key and key not in distribution_index:
                distribution_index[key] = canonical
    return order_index, benchmark_index, distribution_index


def _haversine_distance(coord_a: Tuple[float, float], coord_b: Tuple[float, float]) -> float:
    lat1, lon1 = coord_a
    lat2, lon2 = coord_b
    radius = 6371.0  # km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def _select_price_for_leader(price_entry: Optional[Dict[str, Any]], channel: str, leader_coord: Optional[Tuple[float, float]]) -> Tuple[Optional[float], Optional[float], Optional[str], Optional[str]]:
    """
    Select the price for a leader based on closest benchmark location.
    
    If leader coordinates are available and benchmark points with coordinates exist,
    returns the price from the closest benchmark location. Otherwise falls back to average.
    
    Returns: (price, distance_km, location_name, location_group)
    """
    if not price_entry:
        return (None, None, None, None)
    channel_entry = price_entry.get(channel)
    if not channel_entry:
        return (None, None, None, None)

    points: List[Dict[str, Any]] = channel_entry.get("points") or []
    
    # If we have leader coordinates and benchmark points with coordinates, use closest
    if leader_coord and points:
        best_price: Optional[float] = None
        best_distance: Optional[float] = None
        best_location: Optional[str] = None
        best_location_group: Optional[str] = None
        
        for point in points:
            lat = point.get("lat")
            lon = point.get("lon")
            if lat is None or lon is None:
                continue
            distance = _haversine_distance(leader_coord, (lat, lon))
            if best_distance is None or distance < best_distance:
                best_distance = distance
                best_price = point.get("price")
                best_location = point.get("location", "Unknown")
                best_location_group = point.get("location_group")
        
        # Return closest price if found
        if best_price is not None:
            logger.debug(f"Using closest benchmark location '{best_location}' ({best_location_group}) at {best_distance:.2f}km instead of average")
            return (best_price, best_distance, best_location, best_location_group)

    # Fallback to average if no coordinates available
    avg_price = channel_entry.get("avg")
    return (avg_price, None, None, None)


def _week_start_from_date(day: date) -> date:
    days_since_friday = (day.weekday() - 4) % 7
    return day - timedelta(days=days_since_friday)


def _fetch_benchmark_prices(
    start_date: date,
    end_date: date,
    benchmark_index: Dict[str, str],
) -> Dict[Tuple[str, date], Dict[str, Any]]:
    if not BENCHMARK_API_URL or not BENCHMARK_API_KEY:
        return {}

    series: Dict[Tuple[str, date], Dict[str, Any]] = {}
    cursor = start_date

    while cursor <= end_date:
        chunk_end = min(cursor + timedelta(days=BENCHMARK_CHUNK_DAYS - 1), end_date)
        params = {
            "dateFrom": cursor.strftime("%Y-%m-%d"),
            "dateTo": chunk_end.strftime("%Y-%m-%d"),
            "frequency": "daily",
            "comparisonType": "avg",
            "locationGroups": ",".join(BENCHMARK_LOCATION_GROUPS),
        }
        headers = {
            "apikey": BENCHMARK_API_KEY,
            "Authorization": f"Bearer {BENCHMARK_API_KEY}",
            "Content-Type": "application/json",
        }
        cache_key = (params["dateFrom"], params["dateTo"])
        if cache_key in _BENCHMARK_CACHE:
            chunk_data = _BENCHMARK_CACHE[cache_key]
        else:
            try:
                with httpx.Client(timeout=20.0) as client:
                    response = client.get(BENCHMARK_API_URL, params=params, headers=headers)
                    response.raise_for_status()
                    payload = response.json()
                    chunk_data = payload.get("data", [])
                    _BENCHMARK_CACHE[cache_key] = chunk_data
            except Exception:
                # Leave chunk empty; continue to next window so we still return partial data
                cursor = chunk_end + timedelta(days=1)
                continue

        for entry in chunk_data:
            canonical = benchmark_index.get((entry.get("product_name") or "").strip().lower())
            if not canonical:
                continue
            day = _parse_date(entry.get("date", ""))
            if day is None or day < start_date or day > end_date:
                continue
            try:
                price = float(entry.get("price"))
            except (TypeError, ValueError):
                continue
            if price <= 0:
                continue
            location_group = (entry.get("location_group") or "").strip().lower()
            key = (canonical, day)
            location_name = entry.get("location", "").strip()
            
            # Try to get coordinates from API first
            lat_raw = entry.get("latitude") or entry.get("lat") or entry.get("location_latitude")
            lon_raw = entry.get("longitude") or entry.get("lon") or entry.get("location_longitude")
            try:
                lat_val = float(lat_raw) if lat_raw is not None else None
                lon_val = float(lon_raw) if lon_raw is not None else None
            except (TypeError, ValueError):
                lat_val = None
                lon_val = None
            
            # If no coordinates from API, try geocoding the location name
            if (lat_val is None or lon_val is None) and location_name:
                coords = geocode_location(location_name, location_group)
                if coords:
                    lat_val, lon_val = coords

            record = series.setdefault(
                key,
                {
                    "local_prices": [],
                    "distribution_prices": [],
                    "sunday_prices": [],
                    "local_points": [],
                    "distribution_points": [],
                    "sunday_points": [],
                    "sources": set(),
                },
            )
            # Store location name along with coordinates for better tracking
            price_point = {
                "price": price,
                "lat": lat_val,
                "lon": lon_val,
                "location": location_name,  # Store location name
                "location_group": location_group,  # Store location group
            }
            if location_group == "local-shops":
                record["local_prices"].append(price)
                record["local_points"].append(price_point)
            elif location_group in {"distribution-center", "farm"}:
                record["distribution_prices"].append(price)
                record["distribution_points"].append(price_point)
            elif location_group == "sunday-market":
                record["sunday_prices"].append(price)
                record["sunday_points"].append(price_point)
            record["sources"].add("benchmark_api")

        cursor = chunk_end + timedelta(days=1)

    # Transform averaged values
    final: Dict[Tuple[str, date], Dict[str, Any]] = {}
    for key, record in series.items():
        local_prices = record["local_prices"]
        distribution_prices = record["distribution_prices"]
        final[key] = {
            "local": {
                "avg": sum(local_prices) / len(local_prices) if local_prices else None,
                "points": [pt for pt in record["local_points"] if pt.get("lat") is not None and pt.get("lon") is not None],
            },
            "distribution": {
                "avg": sum(distribution_prices) / len(distribution_prices) if distribution_prices else None,
                "points": [pt for pt in record["distribution_points"] if pt.get("lat") is not None and pt.get("lon") is not None],
            },
            "sunday": {
                "avg": sum(record["sunday_prices"]) / len(record["sunday_prices"])
                if record["sunday_prices"]
                else None,
                "points": [pt for pt in record["sunday_points"] if pt.get("lat") is not None and pt.get("lon") is not None],
            },
            "sources": record["sources"],
        }
    return final


def _fetch_distribution_prices(
    start_date: date,
    end_date: date,
    distribution_index: Dict[str, str],
) -> Dict[Tuple[str, date], Dict[str, Any]]:
    df = fetch_raw_sheet_data()
    if df is None or df.empty:
        return {}

    series: Dict[Tuple[str, date], Dict[str, Any]] = {}
    
    # Filter by date
    mask = (df['date_dt'].dt.date >= start_date) & (df['date_dt'].dt.date <= end_date)
    filtered_df = df.loc[mask]

    for _, row in filtered_df.iterrows():
        raw_name = str(row.get("Product Name", "")).strip().lower()
        canonical = distribution_index.get(raw_name)
        if not canonical:
            continue
        
        day = row['date_dt'].date()
        price = float(row.get("PurchasingPrice", 0.0))
        
        if price <= 0:
            continue

        key = (canonical, day)
        record = series.setdefault(
            key,
            {
                "distribution_prices": [],
                "sources": set(),
            },
        )
        record["distribution_prices"].append(price)
        record["sources"].add("distribution_fallback")

    final: Dict[Tuple[str, date], Dict[str, Any]] = {}
    for key, record in series.items():
        prices = record["distribution_prices"]
        final[key] = {
            "local": {"avg": None, "points": []},
            "distribution": {"avg": sum(prices) / len(prices) if prices else None, "points": []},
            "sunday": {"avg": None, "points": []},
            "sources": record["sources"],
        }
    return final


def _merge_price_series(
    benchmark_series: Dict[Tuple[str, date], Dict[str, Any]],
    distribution_series: Dict[Tuple[str, date], Dict[str, Any]],
) -> Dict[Tuple[str, date], Dict[str, Any]]:
    merged: Dict[Tuple[str, date], Dict[str, Any]] = {}
    for key, value in benchmark_series.items():
        merged[key] = {
            "local": value.get("local", {"avg": None, "points": []}),
            "distribution": value.get("distribution", {"avg": None, "points": []}),
            "sunday": value.get("sunday", {"avg": None, "points": []}),
            "sources": set(value.get("sources", set())),
        }

    for key, value in distribution_series.items():
        existing = merged.setdefault(
            key,
            {
                "local": {"avg": None, "points": []},
                "distribution": {"avg": None, "points": []},
                "sunday": {"avg": None, "points": []},
                "sources": set(),
            },
        )
        for channel in ("local", "distribution", "sunday"):
            existing_channel = existing.setdefault(channel, {"avg": None, "points": []})
            incoming_channel = value.get(channel)
            if not incoming_channel:
                continue
            if existing_channel.get("avg") is None and incoming_channel.get("avg") is not None:
                existing_channel["avg"] = incoming_channel["avg"]
            if incoming_channel.get("points"):
                existing_channel.setdefault("points", []).extend(incoming_channel["points"])
        existing_sources = existing.setdefault("sources", set())
        existing_sources.update(value.get("sources", set()))
    return merged


def _fetch_order_series(
    client,
    start_date: date,
    end_date: date,
    order_index: Dict[str, str],
    deal_types: Optional[Iterable[str]] = None,
) -> List[Dict[str, Any]]:
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date + timedelta(days=1), datetime.min.time())
    deal_filter = ""
    if deal_types:
        allowed = ", ".join(f"'{deal_type}'" for deal_type in deal_types)
        deal_filter = f"            AND gd.deal_type IN ({allowed})\n"
    query = f"""
        SELECT
            toDate(o.created_at)                                          AS order_date,
            g.created_by                                                  AS leader_id,
            anyOrNull(u.phone)                                            AS leader_phone,
            anyOrNull(u.name)                                             AS leader_name,
            anyOrNull(
                coalesce(
                    pn.name,
                    pn_loc.local_name,
                    toString(gd.product_id)
                )
            )                                                             AS product_name,
            sum(gc.quantity)                                              AS total_kg,
            sum(gc.quantity * gd.group_price) / nullIf(sum(gc.quantity), 0) AS unit_price_etb
        FROM orders AS o
        INNER JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        INNER JOIN groups AS g ON gc.group_id = g.id
        INNER JOIN group_deals AS gd ON g.group_deals_id = gd.id
        LEFT JOIN products AS prod ON gd.product_id = prod.id
        LEFT JOIN product_names AS pn ON prod.name_id = pn.id
        LEFT JOIN product_name_localizations AS pn_loc
            ON pn.id = pn_loc.product_name_id AND pn_loc.language_code = 'en'
        LEFT JOIN users AS u ON u.id = g.created_by
        WHERE
            o._peerdb_is_deleted = 0
            AND gc._peerdb_is_deleted = 0
            AND g._peerdb_is_deleted = 0
            AND gd._peerdb_is_deleted = 0
            AND o.status = 'COMPLETED' AND o.deleted_at IS NULL
            AND gc.status = 'COMPLETED' AND gc.deleted_at IS NULL
            AND g.status = 'COMPLETED' AND g.deleted_at IS NULL
            AND o.created_at >= toDateTime('{start_dt.strftime("%Y-%m-%d %H:%M:%S")}')
            AND o.created_at < toDateTime('{end_dt.strftime("%Y-%m-%d %H:%M:%S")}')
{deal_filter}        GROUP BY order_date, leader_id, gd.product_id
        HAVING sum(gc.quantity) > 0
    """

    result = client.query(query)
    rows: List[Dict[str, Any]] = []
    for (
        order_date,
        leader_id,
        leader_phone,
        leader_name,
        product_name,
        total_kg,
        unit_price_etb,
    ) in result.result_rows:
        if not product_name or unit_price_etb is None:
            continue
        canonical = order_index.get(str(product_name).strip().lower())
        if not canonical:
            continue
        if unit_price_etb <= 0:
            continue
        rows.append(
            {
                "order_date": order_date if isinstance(order_date, date) else _parse_date(str(order_date)),
                "leader_id": str(leader_id),
                "leader_phone": (leader_phone or "").strip() if leader_phone else None,
                "leader_name": (leader_name or "").strip() if leader_name else None,
                "canonical_product": canonical,
                "total_kg": float(total_kg or 0),
                "unit_price_etb": float(unit_price_etb),
            }
        )
    return rows


def compute_leader_sensitivity(
    client,
    start_date: date,
    end_date: date,
    leader_coords: Optional[Dict[str, Tuple[float, float]]] = None,
) -> Dict[str, Dict[str, Any]]:
    aliases = _ensure_aliases()
    order_index, benchmark_index, distribution_index = _build_alias_indexes(aliases)

    benchmark_series = _fetch_benchmark_prices(start_date, end_date, benchmark_index)
    distribution_series = _fetch_distribution_prices(start_date, end_date, distribution_index)
    price_series = _merge_price_series(benchmark_series, distribution_series)

    order_rows = _fetch_order_series(client, start_date, end_date, order_index, deal_types=SGL_DEAL_TYPES)

    leader_stats: Dict[str, Dict[str, Any]] = {}

    def ensure_stats(leader_id: str, leader_phone: Optional[str], leader_name: Optional[str]) -> Dict[str, Any]:
        stats = leader_stats.get(leader_id)
        if stats is None:
            stats = {
                "leader_id": leader_id,
                "leader_phone": leader_phone,
                "leader_name": leader_name,
                "total_kg": 0.0,
                "local_gap_sum": 0.0,
                "local_weight": 0.0,
                "local_pct_sum": 0.0,
                "local_above_volume": 0.0,
                "local_dates": set(),
                "distribution_gap_sum": 0.0,
                "distribution_weight": 0.0,
                "distribution_pct_sum": 0.0,
                "distribution_dates": set(),
                "sources": set(),
                "products": {},
                "closest_local_benchmark": {"distance_km": None, "location_group": None, "location": None},
                "closest_distribution_benchmark": {"distance_km": None, "location_group": None, "location": None},
            }
            leader_stats[leader_id] = stats
        if leader_phone and not stats.get("leader_phone"):
            stats["leader_phone"] = leader_phone
        if leader_name and not stats.get("leader_name"):
            stats["leader_name"] = leader_name
        return stats

    leader_coords = leader_coords or {}

    for row in order_rows:
        order_date = row["order_date"]
        if order_date is None:
            continue
        canonical = row["canonical_product"]
        key = (canonical, order_date)
        price_entry = price_series.get(key)
        leader_coord: Optional[Tuple[float, float]] = None
        leader_phone = row.get("leader_phone")
        if leader_phone:
            leader_coord = leader_coords.get(leader_phone)
        local_price, local_distance, local_location, local_location_group = _select_price_for_leader(price_entry, "local", leader_coord)
        distribution_price, dist_distance, dist_location, dist_location_group = _select_price_for_leader(price_entry, "distribution", leader_coord)
        price_sources = set()
        if price_entry and "sources" in price_entry:
            price_sources = price_entry["sources"]

        stats = ensure_stats(row["leader_id"], row["leader_phone"], row["leader_name"])
        
        # Track closest benchmark info (keep closest if multiple orders)
        if local_distance is not None:
            current_local_dist = stats["closest_local_benchmark"]["distance_km"]
            if current_local_dist is None or local_distance < current_local_dist:
                stats["closest_local_benchmark"] = {
                    "distance_km": local_distance,
                    "location_group": local_location_group,
                    "location": local_location,
                }
        if dist_distance is not None:
            current_dist_dist = stats["closest_distribution_benchmark"]["distance_km"]
            if current_dist_dist is None or dist_distance < current_dist_dist:
                stats["closest_distribution_benchmark"] = {
                    "distance_km": dist_distance,
                    "location_group": dist_location_group,
                    "location": dist_location,
                }
        total_kg = row["total_kg"]
        unit_price = row["unit_price_etb"]

        stats["total_kg"] += total_kg

        products_map: Dict[str, Dict[str, Any]] = stats["products"]
        product_stats = products_map.get(canonical)
        if product_stats is None:
            product_stats = {
                "total_kg": 0.0,
                "local_gap_sum": 0.0,
                "local_weight": 0.0,
                "local_pct_sum": 0.0,
                "local_above_volume": 0.0,
                "local_dates": set(),
                "distribution_gap_sum": 0.0,
                "distribution_weight": 0.0,
                "distribution_pct_sum": 0.0,
                "distribution_dates": set(),
            }
            products_map[canonical] = product_stats
        product_stats["total_kg"] += total_kg

        if local_price and local_price > 0:
            gap = local_price - unit_price
            stats["local_gap_sum"] += gap * total_kg
            stats["local_weight"] += total_kg
            stats["local_pct_sum"] += (gap / local_price) * total_kg
            if unit_price >= local_price:
                stats["local_above_volume"] += total_kg
            stats["local_dates"].add(order_date)
            product_stats["local_gap_sum"] += gap * total_kg
            product_stats["local_weight"] += total_kg
            product_stats["local_pct_sum"] += (gap / local_price) * total_kg
            if unit_price >= local_price:
                product_stats["local_above_volume"] += total_kg
            product_stats["local_dates"].add(order_date)

        if distribution_price and distribution_price > 0:
            gap = distribution_price - unit_price
            stats["distribution_gap_sum"] += gap * total_kg
            stats["distribution_weight"] += total_kg
            stats["distribution_pct_sum"] += (gap / distribution_price) * total_kg
            stats["distribution_dates"].add(order_date)
            product_stats["distribution_gap_sum"] += gap * total_kg
            product_stats["distribution_weight"] += total_kg
            product_stats["distribution_pct_sum"] += (gap / distribution_price) * total_kg
            product_stats["distribution_dates"].add(order_date)

        stats["sources"].update(price_sources)

    by_phone: Dict[str, Dict[str, Any]] = {}
    by_leader_id: Dict[str, Dict[str, Any]] = {}
    by_name: Dict[str, Dict[str, Any]] = {}

    for stats in leader_stats.values():
        local_discount_etb = (
            stats["local_gap_sum"] / stats["local_weight"] if stats["local_weight"] > 0 else None
        )
        local_discount_pct = (
            stats["local_pct_sum"] / stats["local_weight"] if stats["local_weight"] > 0 else None
        )
        distribution_discount_etb = (
            stats["distribution_gap_sum"] / stats["distribution_weight"]
            if stats["distribution_weight"] > 0
            else None
        )
        distribution_discount_pct = (
            stats["distribution_pct_sum"] / stats["distribution_weight"]
            if stats["distribution_weight"] > 0
            else None
        )

        combined_sensitivity = None
        if local_discount_etb is not None and distribution_discount_etb is not None:
            combined_sensitivity = (
                DEFAULT_LOCAL_WEIGHT * local_discount_etb
                + DEFAULT_DISTRIBUTION_WEIGHT * distribution_discount_etb
            )
        elif local_discount_etb is not None:
            combined_sensitivity = local_discount_etb
        elif distribution_discount_etb is not None:
            combined_sensitivity = distribution_discount_etb

        combined_sensitivity_pct = None
        if (
            local_discount_pct is not None
            and distribution_discount_pct is not None
        ):
            combined_sensitivity_pct = (
                DEFAULT_LOCAL_WEIGHT * local_discount_pct
                + DEFAULT_DISTRIBUTION_WEIGHT * distribution_discount_pct
            )
        elif local_discount_pct is not None:
            combined_sensitivity_pct = local_discount_pct
        elif distribution_discount_pct is not None:
            combined_sensitivity_pct = distribution_discount_pct

        pct_volume_at_or_above_local = (
            (stats["local_above_volume"] / stats["local_weight"]) * 100
            if stats["local_weight"] > 0
            else None
        )

        coverage_days = len(stats["local_dates"] | stats["distribution_dates"])

        product_entries: List[Dict[str, Any]] = []
        total_leader_volume = stats["total_kg"] or 0.0
        for product_name, pdata in stats["products"].items():
            product_total = pdata["total_kg"]
            if product_total <= 0:
                continue

            product_local_discount_etb = (
                pdata["local_gap_sum"] / pdata["local_weight"] if pdata["local_weight"] > 0 else None
            )
            product_local_discount_pct = (
                pdata["local_pct_sum"] / pdata["local_weight"] if pdata["local_weight"] > 0 else None
            )
            product_distribution_discount_etb = (
                pdata["distribution_gap_sum"] / pdata["distribution_weight"]
                if pdata["distribution_weight"] > 0
                else None
            )
            product_distribution_discount_pct = (
                pdata["distribution_pct_sum"] / pdata["distribution_weight"]
                if pdata["distribution_weight"] > 0
                else None
            )

            product_combined = None
            if (
                product_local_discount_etb is not None
                and product_distribution_discount_etb is not None
            ):
                product_combined = (
                    DEFAULT_LOCAL_WEIGHT * product_local_discount_etb
                    + DEFAULT_DISTRIBUTION_WEIGHT * product_distribution_discount_etb
                )
            elif product_local_discount_etb is not None:
                product_combined = product_local_discount_etb
            elif product_distribution_discount_etb is not None:
                product_combined = product_distribution_discount_etb

            product_combined_pct = None
            if (
                product_local_discount_pct is not None
                and product_distribution_discount_pct is not None
            ):
                product_combined_pct = (
                    DEFAULT_LOCAL_WEIGHT * product_local_discount_pct
                    + DEFAULT_DISTRIBUTION_WEIGHT * product_distribution_discount_pct
                )
            elif product_local_discount_pct is not None:
                product_combined_pct = product_local_discount_pct
            elif product_distribution_discount_pct is not None:
                product_combined_pct = product_distribution_discount_pct

            volume_share_pct = (
                (product_total / total_leader_volume) * 100 if total_leader_volume > 0 else 0.0
            )

            product_entries.append(
                {
                    "product_name": product_name,
                    "total_kg": product_total,
                    "volume_share_pct": volume_share_pct,
                    "local_discount_etb": product_local_discount_etb,
                    "distribution_discount_etb": product_distribution_discount_etb,
                    "combined_sensitivity_etb": product_combined,
                    "borderline_discount_etb": product_combined,
                    "borderline_discount_pct": product_combined_pct,
                    "local_discount_pct": product_local_discount_pct,
                    "distribution_discount_pct": product_distribution_discount_pct,
                    "local_observations": len(pdata["local_dates"]),
                    "distribution_observations": len(pdata["distribution_dates"]),
                    "pct_volume_at_or_above_local": (
                        (pdata["local_above_volume"] / pdata["local_weight"]) * 100
                        if pdata["local_weight"] > 0
                        else None
                    ),
                }
            )

        product_entries.sort(key=lambda item: item["total_kg"], reverse=True)
        top_products = product_entries[:5]

        # Get closest benchmark info (use the one with shortest distance)
        local_bench = stats.get("closest_local_benchmark") or {}
        dist_bench = stats.get("closest_distribution_benchmark") or {}
        local_dist = local_bench.get("distance_km")
        dist_dist = dist_bench.get("distance_km")
        
        if local_dist is not None and dist_dist is not None:
            # Use whichever is closer
            closest_benchmark = local_bench if local_dist <= dist_dist else dist_bench
        elif local_dist is not None:
            closest_benchmark = local_bench
        elif dist_dist is not None:
            closest_benchmark = dist_bench
        else:
            closest_benchmark = {}
        
        record = {
            "leader_id": stats["leader_id"],
            "leader_phone": stats.get("leader_phone"),
            "leader_name": stats.get("leader_name"),
            "total_kg": stats["total_kg"],
            "local_discount_etb": local_discount_etb,
            "distribution_discount_etb": distribution_discount_etb,
            "combined_sensitivity_etb": combined_sensitivity,
            "combined_sensitivity_pct": combined_sensitivity_pct,
            "local_discount_pct": local_discount_pct,
            "distribution_discount_pct": distribution_discount_pct,
            "coverage_days": coverage_days,
            "local_observations": len(stats["local_dates"]),
            "distribution_observations": len(stats["distribution_dates"]),
            "pct_volume_at_or_above_local": pct_volume_at_or_above_local,
            "source_flags": {
                "benchmark_api": "benchmark_api" in stats["sources"],
                "distribution_fallback": "distribution_fallback" in stats["sources"],
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            "product_sensitivity": top_products,
            "closest_benchmark": {
                "distance_km": closest_benchmark.get("distance_km"),
                "location_group": closest_benchmark.get("location_group"),
                "location": closest_benchmark.get("location"),
            },
            "closest_local_benchmark": stats.get("closest_local_benchmark", {}),
            "closest_distribution_benchmark": stats.get("closest_distribution_benchmark", {}),
        }

        if record["leader_phone"]:
            by_phone[record["leader_phone"]] = record
        if record["leader_name"]:
            by_name[record["leader_name"].strip().lower()] = record
        by_leader_id[record["leader_id"]] = record

    return {
        "by_phone": by_phone,
        "by_leader_id": by_leader_id,
        "by_name": by_name,
    }


def compute_weekly_retention(
    client,
    start_date: date,
    end_date: date,
    leader_coords: Optional[Dict[str, Tuple[float, float]]] = None,
) -> List[Dict[str, Any]]:
    aliases = _ensure_aliases()
    order_index, benchmark_index, distribution_index = _build_alias_indexes(aliases)

    benchmark_series = _fetch_benchmark_prices(start_date, end_date, benchmark_index)
    distribution_series = _fetch_distribution_prices(start_date, end_date, distribution_index)
    price_series = _merge_price_series(benchmark_series, distribution_series)

    order_rows = _fetch_order_series(client, start_date, end_date, order_index, deal_types=SGL_DEAL_TYPES)
    leader_coords = leader_coords or {}

    product_weeks: Dict[str, Dict[date, Dict[str, Any]]] = defaultdict(dict)

    for row in order_rows:
        order_date = row["order_date"]
        if order_date is None:
            continue
        week_start = _week_start_from_date(order_date)
        canonical = row["canonical_product"]
        entry = product_weeks.setdefault(canonical, {}).setdefault(
            week_start,
            {
                "leaders": set(),
                "unit_price_sum": 0.0,
                "unit_price_weight": 0.0,
                "local_gap_sum": 0.0,
                "local_weight": 0.0,
                "local_pct_sum": 0.0,
                "distribution_gap_sum": 0.0,
                "distribution_weight": 0.0,
                "distribution_pct_sum": 0.0,
                "sunday_gap_sum": 0.0,
                "sunday_weight": 0.0,
                "sunday_pct_sum": 0.0,
            },
        )

        total_kg = row["total_kg"]
        unit_price = row["unit_price_etb"]
        entry["leaders"].add(row["leader_id"])
        entry["unit_price_sum"] += unit_price * total_kg
        entry["unit_price_weight"] += total_kg

        leader_coord: Optional[Tuple[float, float]] = None
        leader_phone = row.get("leader_phone")
        if leader_phone:
            leader_coord = leader_coords.get(leader_phone)

        price_entry = price_series.get((canonical, order_date))
        local_price, _, _, _ = _select_price_for_leader(price_entry, "local", leader_coord)
        distribution_price, _, _, _ = _select_price_for_leader(price_entry, "distribution", leader_coord)
        sunday_price, _, _, _ = _select_price_for_leader(price_entry, "sunday", leader_coord)

        if local_price and local_price > 0:
            gap = local_price - unit_price
            entry["local_gap_sum"] += gap * total_kg
            entry["local_weight"] += total_kg
            entry["local_pct_sum"] += (gap / local_price) * total_kg

        if distribution_price and distribution_price > 0:
            gap = distribution_price - unit_price
            entry["distribution_gap_sum"] += gap * total_kg
            entry["distribution_weight"] += total_kg
            entry["distribution_pct_sum"] += (gap / distribution_price) * total_kg

        if sunday_price and sunday_price > 0:
            gap = sunday_price - unit_price
            entry["sunday_gap_sum"] += gap * total_kg
            entry["sunday_weight"] += total_kg
            entry["sunday_pct_sum"] += (gap / sunday_price) * total_kg

    products_payload: List[Dict[str, Any]] = []

    for product, weeks_map in product_weeks.items():
        sorted_weeks = sorted(weeks_map.keys())
        for idx, week_start in enumerate(sorted_weeks):
            current_entry = weeks_map[week_start]
            next_week = weeks_map.get(sorted_weeks[idx + 1]) if idx + 1 < len(sorted_weeks) else None
            if next_week and current_entry["leaders"]:
                retained = len(current_entry["leaders"] & next_week["leaders"])
                current_entry["retention_pct"] = (retained / len(current_entry["leaders"])) * 100
            else:
                current_entry["retention_pct"] = None

        weeks_payload: List[Dict[str, Any]] = []
        for week_start in sorted_weeks:
            info = weeks_map[week_start]
            avg_unit_price = (
                info["unit_price_sum"] / info["unit_price_weight"] if info["unit_price_weight"] > 0 else None
            )
            local_down = info["local_gap_sum"] / info["local_weight"] if info["local_weight"] > 0 else None
            local_pct = info["local_pct_sum"] / info["local_weight"] if info["local_weight"] > 0 else None
            distribution_down = (
                info["distribution_gap_sum"] / info["distribution_weight"] if info["distribution_weight"] > 0 else None
            )
            distribution_pct = (
                info["distribution_pct_sum"] / info["distribution_weight"] if info["distribution_weight"] > 0 else None
            )
            sunday_down = info["sunday_gap_sum"] / info["sunday_weight"] if info["sunday_weight"] > 0 else None
            sunday_pct = info["sunday_pct_sum"] / info["sunday_weight"] if info["sunday_weight"] > 0 else None

            weeks_payload.append(
                {
                    "week_start": week_start.isoformat(),
                    "active_leaders": len(info["leaders"]),
                    "avg_unit_price": avg_unit_price,
                    "retained_pct": info.get("retention_pct"),
                    "price_down": {
                        "local_etb": local_down,
                        "local_pct": (local_pct * 100) if local_pct is not None else None,
                        "distribution_etb": distribution_down,
                        "distribution_pct": (distribution_pct * 100) if distribution_pct is not None else None,
                        "sunday_etb": sunday_down,
                        "sunday_pct": (sunday_pct * 100) if sunday_pct is not None else None,
                    },
                }
            )

        products_payload.append(
            {
                "product": product,
                "weeks": weeks_payload,
            }
        )

    return products_payload

