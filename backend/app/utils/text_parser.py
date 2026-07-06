"""Unstructured text parser for company AI/SaaS spending lists.

Uses the Gemini LLM to parse natural language spending notes (e.g. .txt files)
into structured row dicts.  If the LLM is unavailable or fails, falls back
to a heuristic regex-based parser.
"""

from __future__ import annotations

import re
from typing import Any

from app.core.logging import get_logger
from app.services.llm_client import get_llm_client
from app.utils.knowledge_base import lookup_tool

logger = get_logger("utils.text_parser")

_LLM_SCHEMA_HINT = """{
  "tools": [
    {
      "tool_name": "string (e.g. 'Jasper AI')",
      "vendor": "string (optional, e.g. 'Jasper')",
      "monthly_cost": 0.0,
      "seats_purchased": 0,
      "seats_active_estimated": 0,
      "plan_tier": "string (optional)",
      "is_ai_addon": false,
      "renewal_date": "string (optional, YYYY-MM-DD)"
    }
  ]
}"""


async def parse_unstructured_text(content: str) -> list[dict[str, Any]]:
    """Parse unstructured natural-language SaaS list into row dicts."""
    # Attempt LLM-based extraction first
    llm = get_llm_client()
    if llm.is_enabled:
        try:
            logger.info("Attempting LLM-based parsing of unstructured text")
            result = await _parse_with_llm(llm, content)
            if result:
                logger.info("Successfully extracted %d tools via LLM", len(result))
                return result
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM-based text parsing failed: %s — falling back to regex", exc)

    # Fallback to regex-based heuristic parsing
    logger.info("Using regex fallback parsing for unstructured text")
    return _parse_with_regex(content)


async def _parse_with_llm(llm: Any, content: str) -> list[dict[str, Any]] | None:
    prompt = (
        "You are parsing an unstructured natural language text list of company software subscriptions.\n"
        "Extract all mentioned tools that have pricing, cost, or seat usage information.\n\n"
        "Text content:\n"
        "------------------------------------\n"
        f"{content}\n"
        "------------------------------------\n\n"
        "Extract these fields for each tool. If some fields are unknown, omit them from the object or set to null:\n"
        "1. tool_name (e.g. 'Jasper AI')\n"
        "2. vendor (optional, e.g. 'Jasper')\n"
        "3. monthly_cost (number, monthly cost in USD. If it is described as annual, divide by 12)\n"
        "4. seats_purchased (integer, number of seats purchased/licensed)\n"
        "5. seats_active_estimated (integer, number of active/used seats)\n"
        "6. plan_tier (string, plan tier, e.g. 'Team', 'Enterprise', 'Business')\n"
        "7. is_ai_addon (boolean, true if it is a specific AI add-on to a parent tool, e.g. Notion AI, Figma AI)\n"
        "8. renewal_date (string, ISO format YYYY-MM-DD if renewal date is mentioned)\n"
    )

    result = await llm.generate_json(prompt, schema_hint=_LLM_SCHEMA_HINT)
    if not result or "tools" not in result:
        return None

    tools = result["tools"]
    if not isinstance(tools, list):
        return None

    # Filter out empty entries and clean up fields
    valid_tools: list[dict[str, Any]] = []
    for t in tools:
        if not isinstance(t, dict) or not t.get("tool_name"):
            continue

        # Ensure cost is a float
        try:
            cost = float(t.get("monthly_cost") or 0.0)
        except (ValueError, TypeError):
            cost = 0.0

        cleaned = {
            "tool_name": str(t["tool_name"]).strip(),
            "vendor": str(t.get("vendor") or "").strip() or None,
            "monthly_cost": cost,
            "seats_purchased": t.get("seats_purchased"),
            "seats_active_estimated": t.get("seats_active_estimated"),
            "plan_tier": str(t.get("plan_tier") or "").strip() or None,
            "is_ai_addon": t.get("is_ai_addon"),
            "renewal_date": t.get("renewal_date"),
        }
        valid_tools.append({k: v for k, v in cleaned.items() if v is not None})

    return valid_tools


def _parse_with_regex(content: str) -> list[dict[str, Any]]:
    """Simple line-by-line regex parser for tool names, cost, and seats."""
    rows: list[dict[str, Any]] = []
    lines = content.split("\n")

    # Pattern to find money: e.g. $170/mo, $500, ~$300/mo, $436/month
    money_re = re.compile(r"\$\s*([\d,]+)")
    # Pattern to find seats/licenses: e.g. 5 people, 6 licenses, 15 engineers, 20 seats, 3 seats
    seats_re = re.compile(r"(\d+)\s*(?:seat|license|licence|people|member|engineer|user|person)")

    for line in lines:
        line_str = line.strip()
        if not line_str or line_str.lower().startswith(("ai tools", "ops -", "company wide", "marketing team", "sales:", "eng team", "design:", "support:", "renewal stuff", "random note")):
            continue

        # Clean leading bullet points, symbols, numbers, and whitespace first
        line_str = re.sub(r"^[\s\*\-\•\d\.\)]+", "", line_str).strip()

        # Look for money match first
        money_match = money_re.search(line_str)
        if not money_match:
            continue

        try:
            cost = float(money_match.group(1).replace(",", ""))
        except ValueError:
            continue

        # Extract tool name from the left side of the cost or hyphens
        # Split by typical separators (excluding leading hyphens which are now stripped)
        parts = re.split(r"[-~–—:]", line_str, maxsplit=1)
        potential_name = ""
        if len(parts) > 1:
            potential_name = parts[0].strip()
        else:
            # If no separator, take everything before the dollar sign
            dollar_idx = line_str.find("$")
            if dollar_idx > 0:
                potential_name = line_str[:dollar_idx].strip()

        # Clean up any trailing/leading spaces or punctuation
        potential_name = potential_name.strip(" ,.-–—~:")

        if not potential_name:
            continue

        # Skip headers or generic notes that matched by mistake
        if len(potential_name.split()) > 5:
            continue

        # Lookup tool or infer vendor
        vendor = None
        known = lookup_tool(potential_name)
        if known:
            vendor = known.tool_name.split()[0]
        else:
            vendor = potential_name.split()[0] if potential_name.split() else "Unknown"

        # Try to parse seats
        seats_match = seats_re.search(line_str)
        seats = int(seats_match.group(1)) if seats_match else 1

        rows.append({
            "tool_name": potential_name,
            "vendor": vendor,
            "monthly_cost": cost,
            "seats_purchased": seats,
            "seats_active_estimated": None,  # Will be simulated downstream
        })

    return rows
