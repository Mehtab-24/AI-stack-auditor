"""PDF invoice parser — extracts tool/cost data from uploaded PDFs.

Uses pdfplumber to parse uploaded PDF files, supporting two strategies:

Strategy 1 — Table extraction (preferred):
    pdfplumber can extract tables from PDFs that have structured data.
    The first row is treated as a header; remaining rows become dicts.
    Column names are normalised to the same field names used by the CSV parser
    (tool_name, vendor, monthly_cost, etc.) so the Discovery Agent receives
    identical input regardless of whether CSV or PDF was uploaded.

Strategy 2 — Raw-text parsing (fallback):
    When table extraction finds nothing, we fall back to line-by-line text
    parsing, looking for patterns like "ToolName  $X.XX" or "Service: $X".
    This catches simple invoice formats that aren't structured as tables.

Raises CSVParsingError (consistent with csv_parser.py) if no data is found.
"""

from __future__ import annotations

import re
from io import BytesIO

from app.core.exceptions import CSVParsingError
from app.core.logging import get_logger

logger = get_logger("utils.pdf_parser")

# Field name normalisation map — map common invoice column headers to our field names
_COLUMN_ALIASES: dict[str, str] = {
    # tool_name
    "tool": "tool_name",
    "product": "tool_name",
    "product name": "tool_name",
    "service": "tool_name",
    "service name": "tool_name",
    "name": "tool_name",
    "description": "tool_name",
    "item": "tool_name",
    "software": "tool_name",
    "application": "tool_name",
    # vendor
    "vendor": "vendor",
    "supplier": "vendor",
    "provider": "vendor",
    "company": "vendor",
    "manufacturer": "vendor",
    # monthly_cost
    "monthly cost": "monthly_cost",
    "monthly_cost": "monthly_cost",
    "cost": "monthly_cost",
    "price": "monthly_cost",
    "monthly price": "monthly_cost",
    "monthly fee": "monthly_cost",
    "amount": "monthly_cost",
    "total": "monthly_cost",
    "charge": "monthly_cost",
    "fee": "monthly_cost",
    # plan_tier
    "tier": "plan_tier",
    "plan": "plan_tier",
    "plan tier": "plan_tier",
    "subscription": "plan_tier",
    "subscription type": "plan_tier",
    "package": "plan_tier",
    # seats_purchased
    "seats": "seats_purchased",
    "seats purchased": "seats_purchased",
    "licenses": "seats_purchased",
    "licences": "seats_purchased",
    "users": "seats_purchased",
    "num users": "seats_purchased",
    "quantity": "seats_purchased",
}

# Regex patterns for money values in text — matches $X, $X.XX, $X,XXX
_MONEY_RE = re.compile(r"\$\s*([\d,]+(?:\.\d{1,2})?)")

# Minimum confidence: row must have at least a name AND a cost
_MIN_FIELDS = {"tool_name", "monthly_cost"}


def parse_pdf(content: bytes) -> list[dict]:
    """Parse a PDF invoice and return rows compatible with the Discovery Agent.

    Parameters
    ----------
    content:
        Raw bytes of the uploaded PDF file.

    Returns
    -------
    list[dict]
        List of dicts with at minimum ``tool_name`` and ``monthly_cost`` keys.

    Raises
    ------
    CSVParsingError
        If the PDF cannot be opened or no usable data is found.
    """
    try:
        import pdfplumber  # type: ignore[import]
        from app.core.logging import _silence_noisy_loggers
        _silence_noisy_loggers()
    except ImportError as exc:
        raise CSVParsingError(
            message="PDF parsing requires pdfplumber. Install it with: pip install pdfplumber",
        ) from exc

    try:
        with pdfplumber.open(BytesIO(content)) as pdf:
            # Strategy 1: table extraction
            rows = _extract_tables(pdf)
            if rows:
                logger.info("PDF parser: extracted %d rows via table detection", len(rows))
                return rows

            # Strategy 2: raw text parsing
            rows = _extract_from_text(pdf)
            if rows:
                logger.info("PDF parser: extracted %d rows via text parsing", len(rows))
                return rows

    except CSVParsingError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise CSVParsingError(
            message=f"Failed to open or parse the uploaded PDF: {exc}",
        ) from exc

    raise CSVParsingError(
        message=(
            "No tool data could be extracted from the uploaded PDF. "
            "Ensure the PDF contains a table or list with tool names and costs, "
            "or upload a CSV file instead."
        )
    )


# ── Strategy 1: Table extraction ─────────────────────────────────────────────


def _extract_tables(pdf: object) -> list[dict]:
    """Extract structured tables from the PDF using pdfplumber."""
    all_rows: list[dict] = []

    for page in pdf.pages:  # type: ignore[union-attr]
        tables = page.extract_tables()
        for table in tables:
            if not table or len(table) < 2:
                continue

            # First row is the header
            raw_headers = [str(h or "").lower().strip() for h in table[0]]
            normalised_headers = [_COLUMN_ALIASES.get(h, h) for h in raw_headers]

            for raw_row in table[1:]:
                row: dict = {}
                for i, cell in enumerate(raw_row):
                    if i >= len(normalised_headers):
                        break
                    field = normalised_headers[i]
                    value = str(cell or "").strip()
                    if not value or value.lower() in {"-", "n/a", "none", ""}:
                        continue
                    row[field] = _clean_value(field, value)

                if _MIN_FIELDS.issubset(row.keys()) and row.get("tool_name"):
                    all_rows.append(row)

    return all_rows


# ── Strategy 2: Raw-text parsing ─────────────────────────────────────────────


def _extract_from_text(pdf: object) -> list[dict]:
    """Scan raw PDF text for lines that look like tool + cost entries."""
    all_rows: list[dict] = []

    for page in pdf.pages:  # type: ignore[union-attr]
        text = page.extract_text() or ""
        lines = [l.strip() for l in text.splitlines() if l.strip()]

        for line in lines:
            row = _parse_text_line(line)
            if row:
                all_rows.append(row)

    return all_rows


def _parse_text_line(line: str) -> dict | None:
    """Try to extract a tool name and cost from a single text line.

    Handles formats like:
    - "GitHub Copilot  $19.00"
    - "Notion AI — $16/user/month"
    - "OpenAI API: $150.00"
    """
    money_match = _MONEY_RE.search(line)
    if not money_match:
        return None

    # Strip the dollar amount and surrounding noise from the line
    # to get the tool name from the remaining text
    cost_str = money_match.group(1).replace(",", "")
    try:
        monthly_cost = float(cost_str)
    except ValueError:
        return None

    # Everything before the dollar sign is the potential tool name
    name_part = line[: money_match.start()].strip()
    # Clean up separators
    name_part = re.sub(r"[\-–—:|]+$", "", name_part).strip()
    # Remove trailing noise (per-user, /month, etc.)
    name_part = re.sub(r"\s*/\s*(user|month|seat|mo).*$", "", name_part, flags=re.IGNORECASE).strip()

    if not name_part or len(name_part) < 2:
        return None

    # Don't treat obvious non-tool lines (totals, headers) as tools
    skip_words = {"total", "subtotal", "tax", "vat", "gst", "discount", "credit", "invoice"}
    if name_part.lower() in skip_words:
        return None

    return {
        "tool_name": name_part,
        "vendor": "",  # Vendor unknown from raw text
        "monthly_cost": monthly_cost,
    }


# ── Value cleaning ───────────────────────────────────────────────────────────


def _clean_value(field: str, value: str) -> str | float | int:
    """Convert a cell value to its expected Python type based on field name."""
    if field == "monthly_cost":
        # Strip currency symbols and commas: "$1,200.00" → 1200.0
        cleaned = re.sub(r"[^\d.]", "", value.replace(",", ""))
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    if field in ("seats_purchased", "seats_active_estimated"):
        try:
            return int(re.sub(r"[^\d]", "", value))
        except ValueError:
            return 1

    return value
