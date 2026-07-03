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

REQUIRED_COLUMNS: set[str] = {"tool_name", "vendor", "monthly_cost"}

OPTIONAL_COLUMNS: set[str] = {
    "plan_tier",
    "seats_purchased",
    "seats_active_estimated",
    "is_ai_addon",
    "renewal_date",
    "notes",
    "category",
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
        df = pd.read_csv(StringIO(content))
    except pd.errors.ParserError as exc:
        raise CSVParsingError(
            message="Failed to parse CSV structure.",
            details={"parser_error": str(exc)},
        ) from exc

    if df.empty:
        raise CSVParsingError(message="CSV file is empty — no data rows found.")

    # Normalise column names: strip whitespace, lowercase, spaces → underscores
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

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
