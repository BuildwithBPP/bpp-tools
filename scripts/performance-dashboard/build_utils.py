"""Portable validation and safe serialization helpers for the Performance Dashboard."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path


MONTH_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
FINANCIAL_FILES = ("monthly-pnl.csv", "account-by-month.csv", "transactions-all.csv")


def source_age_days(paths: list[Path], now: float) -> float:
    return (now - max(path.stat().st_mtime for path in paths)) / 86400


def validate_source_families(financial_dir: Path, social_dir: Path, max_age_days: int, now: float | None = None) -> dict[str, float]:
    now = time.time() if now is None else now
    financial_files = [financial_dir / name for name in FINANCIAL_FILES]
    missing_financial = [path.name for path in financial_files if not path.is_file()]
    if missing_financial:
        raise ValueError("Financial source family is unavailable: " + ", ".join(missing_financial))
    social_files = list(social_dir.glob("*.csv")) if social_dir.is_dir() else []
    if not social_files:
        raise ValueError("Social source family is unavailable: no CSV files found")
    financial_age = source_age_days(financial_files, now)
    social_age = source_age_days(social_files, now)
    if financial_age > max_age_days:
        raise ValueError(f"Financial source family is stale: {financial_age:.1f} days old, limit is {max_age_days}.")
    if social_age > max_age_days:
        raise ValueError(f"Social source family is stale: {social_age:.1f} days old, limit is {max_age_days}.")
    return {"financial_age_days": financial_age, "social_age_days": social_age}


def validate_month_schema(payload: dict) -> None:
    months = payload.get("months")
    data = payload.get("data")
    if not isinstance(months, list) or not isinstance(data, dict):
        raise ValueError("Dashboard payload requires months and data.")
    for month in months:
        if not isinstance(month, str) or not MONTH_PATTERN.fullmatch(month):
            raise ValueError(f"Invalid month key: {month}")
    if set(months) != set(data):
        raise ValueError("Month list and data keys must match.")


def serialize_for_script(payload: dict) -> str:
    validate_month_schema(payload)
    return json.dumps(payload, separators=(",", ":")).replace("</", "<\\/")
