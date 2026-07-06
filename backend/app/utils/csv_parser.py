"""CSV parsing utility.

Converts raw CSV bytes/string into a list of row-dicts that the Discovery
Agent can consume.  Validates that the minimum required columns are present.
"""

from __future__ import annotations

from io import StringIO
from typing import Any

import pandas as pd

from app.core.exceptions import CSVParsingError
from app.core.logging import get_logger

logger = get_logger("utils.csv_parser")

REQUIRED_COLUMNS: set[str] = {"tool_name", "monthly_cost"}

_HEADER_MAP: dict[str, str] = {
    # tool_name
    "tool": "tool_name",
    "name": "tool_name",
    "tool_name": "tool_name",
    "tool name": "tool_name",
    # vendor
    "vendor": "vendor",
    "vendor name": "vendor",
    "vendor_name": "vendor",
    # monthly_cost
    "cost": "monthly_cost",
    "monthly cost": "monthly_cost",
    "monthly_cost": "monthly_cost",
    "amount": "monthly_cost",
    # plan_tier
    "plan": "plan_tier",
    "plan_tier": "plan_tier",
    "tier": "plan_tier",
    # seats_purchased
    "seats": "seats_purchased",
    "seats_purchased": "seats_purchased",
    "qty": "seats_purchased",
    "quantity": "seats_purchased",
    # seats_active_estimated
    "active": "seats_active_estimated",
    "seats_active_estimated": "seats_active_estimated",
    "active_seats": "seats_active_estimated",
    # is_ai_addon
    "is_ai_addon": "is_ai_addon",
    "addon": "is_ai_addon",
    "ai_addon": "is_ai_addon",
    # renewal_date
    "renewal": "renewal_date",
    "renewal_date": "renewal_date",
}


def parse_csv(content: str | bytes) -> list[dict[str, Any]]:
    """Parse CSV content into a list of dictionaries.

    Parameters
    ----------
    content:
        Raw CSV as a string or UTF-8 bytes.

    Returns
    -------
    list[dict[str, Any]]
        One dict per row, keys normalised to lowercase/underscored.

    Raises
    ------
    CSVParsingError
        If the content cannot be decoded, parsed, or is missing required
        columns.
    """
    if isinstance(content, bytes):
        try:
            content = content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise CSVParsingError(
                message="CSV file is not valid UTF-8.",
                details={"encoding_error": str(exc)},
            ) from exc

    try:
        # Detect delimiter if it's tab-separated
        sep = "\t" if "\t" in content and "," not in content else ","
        df = pd.read_csv(StringIO(content), sep=sep)
    except pd.errors.ParserError as exc:
        raise CSVParsingError(
            message="Failed to parse CSV structure.",
            details={"parser_error": str(exc)},
        ) from exc

    if df.empty:
        raise CSVParsingError(message="CSV file is empty — no data rows found.")

    # Normalise column names: strip, lowercase, map using header map
    raw_cols = [col.strip().lower() for col in df.columns]
    mapped_cols = [_HEADER_MAP.get(c, c).replace(" ", "_") for c in raw_cols]
    df.columns = mapped_cols

    # Validate required columns
    present = set(df.columns)
    missing = REQUIRED_COLUMNS - present
    if missing:
        raise CSVParsingError(
            message="CSV is missing required columns.",
            details={"missing_columns": sorted(missing), "found_columns": sorted(present)},
        )

    # Drop fully-empty rows
    df = df.dropna(how="all")

    # Convert NaN to None for cleaner downstream processing
    rows: list[dict[str, Any]] = df.where(df.notna(), None).to_dict(orient="records")

    logger.info("Parsed CSV: %d rows, columns=%s", len(rows), sorted(present))
    return rows
