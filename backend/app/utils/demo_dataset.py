"""Demo dataset — synthetic CSV fixture for the "Try Demo" flow.

Contains 2 companies with ~20 line items each, deliberately including:
  - 2+ overlapping tools in the same category
  - 1 hidden AI add-on inside a larger SaaS bill
  - 1 clearly underused premium tier
  - 1 upcoming renewal on a low-usage tool
  - 1 tool that is expensive but should score high on ROI
"""

from __future__ import annotations

from typing import Any

# Each row mirrors the CSV schema: tool_name, vendor, monthly_cost, plan_tier,
# seats_purchased, seats_active_estimated, is_ai_addon, renewal_date, notes
DEMO_ROWS: list[dict[str, Any]] = [
    # ── Company: Acme AI Labs ─────────────────────────────────────────
    # Coding — 3 overlapping tools
    {"tool_name": "GitHub Copilot", "vendor": "GitHub", "monthly_cost": 190, "plan_tier": "business", "seats_purchased": 10, "seats_active_estimated": 9, "is_ai_addon": False, "renewal_date": "2026-09-15", "notes": "Core dev tool"},
    {"tool_name": "Cursor Pro", "vendor": "Anysphere", "monthly_cost": 200, "plan_tier": "pro", "seats_purchased": 10, "seats_active_estimated": 4, "is_ai_addon": False, "renewal_date": "2026-08-01", "notes": "Some devs prefer Cursor"},
    {"tool_name": "Tabnine Enterprise", "vendor": "Tabnine", "monthly_cost": 150, "plan_tier": "enterprise", "seats_purchased": 10, "seats_active_estimated": 2, "is_ai_addon": False, "renewal_date": "2026-07-20", "notes": "Legacy purchase"},

    # Writing — 3 overlapping + 1 add-on
    {"tool_name": "Jasper AI", "vendor": "Jasper", "monthly_cost": 49, "plan_tier": "creator", "seats_purchased": 3, "seats_active_estimated": 1, "is_ai_addon": False, "renewal_date": None, "notes": "Marketing team only"},
    {"tool_name": "Copy.ai", "vendor": "Copy.ai", "monthly_cost": 36, "plan_tier": "pro", "seats_purchased": 3, "seats_active_estimated": 3, "is_ai_addon": False, "renewal_date": None, "notes": "Marketing daily driver"},
    {"tool_name": "Writer.com", "vendor": "Writer", "monthly_cost": 108, "plan_tier": "team", "seats_purchased": 6, "seats_active_estimated": 5, "is_ai_addon": False, "renewal_date": None, "notes": "Style guide enforcement"},
    {"tool_name": "Notion AI Add-on", "vendor": "Notion", "monthly_cost": 80, "plan_tier": "plus", "seats_purchased": 10, "seats_active_estimated": 4, "is_ai_addon": True, "renewal_date": None, "notes": "Hidden inside Notion bill"},

    # Meetings — 3 overlapping
    {"tool_name": "Otter.ai Business", "vendor": "Otter", "monthly_cost": 120, "plan_tier": "business", "seats_purchased": 8, "seats_active_estimated": 7, "is_ai_addon": False, "renewal_date": None, "notes": "Primary meeting tool"},
    {"tool_name": "Fireflies.ai", "vendor": "Fireflies", "monthly_cost": 152, "plan_tier": "business", "seats_purchased": 8, "seats_active_estimated": 2, "is_ai_addon": False, "renewal_date": None, "notes": "Sales team only"},
    {"tool_name": "Fathom Premium", "vendor": "Fathom", "monthly_cost": 96, "plan_tier": "premium", "seats_purchased": 8, "seats_active_estimated": 1, "is_ai_addon": False, "renewal_date": None, "notes": "Trial never cancelled"},

    # Design
    {"tool_name": "Midjourney Pro", "vendor": "Midjourney", "monthly_cost": 60, "plan_tier": "pro", "seats_purchased": 2, "seats_active_estimated": 2, "is_ai_addon": False, "renewal_date": None, "notes": "Design team"},
    {"tool_name": "Figma AI Add-on", "vendor": "Figma", "monthly_cost": 75, "plan_tier": "organization", "seats_purchased": 15, "seats_active_estimated": 3, "is_ai_addon": True, "renewal_date": None, "notes": "Bundled in Figma Org plan"},

    # Support — 2 overlapping
    {"tool_name": "Intercom Fin AI", "vendor": "Intercom", "monthly_cost": 395, "plan_tier": "pro", "seats_purchased": 5, "seats_active_estimated": 5, "is_ai_addon": False, "renewal_date": None, "notes": "Primary support automation"},
    {"tool_name": "Ada Support AI", "vendor": "Ada", "monthly_cost": 480, "plan_tier": "enterprise", "seats_purchased": 5, "seats_active_estimated": 2, "is_ai_addon": False, "renewal_date": None, "notes": "Enterprise tier — underused"},

    # Analytics
    {"tool_name": "Hex Magic", "vendor": "Hex", "monthly_cost": 240, "plan_tier": "team", "seats_purchased": 4, "seats_active_estimated": 4, "is_ai_addon": False, "renewal_date": None, "notes": "Data team daily driver"},
    {"tool_name": "Mode AI Assist", "vendor": "Mode", "monthly_cost": 180, "plan_tier": "business", "seats_purchased": 4, "seats_active_estimated": 1, "is_ai_addon": False, "renewal_date": "2026-07-18", "notes": "Renewal coming up — barely used"},

    # Search — HIGH ROI despite high cost (deliberate)
    {"tool_name": "Perplexity Enterprise", "vendor": "Perplexity", "monthly_cost": 400, "plan_tier": "enterprise", "seats_purchased": 20, "seats_active_estimated": 18, "is_ai_addon": False, "renewal_date": None, "notes": "Entire company uses daily"},
    {"tool_name": "Glean", "vendor": "Glean", "monthly_cost": 600, "plan_tier": "enterprise", "seats_purchased": 20, "seats_active_estimated": 19, "is_ai_addon": False, "renewal_date": None, "notes": "Internal knowledge search — critical"},
]


DEMO_COMPANY_NAME = "Acme AI Labs"


def get_demo_dataset() -> dict[str, Any]:
    """Return the demo dataset as a JSON-serialisable dict."""
    return {
        "company_name": DEMO_COMPANY_NAME,
        "rows": DEMO_ROWS,
        "row_count": len(DEMO_ROWS),
    }


def get_demo_rows() -> list[dict[str, Any]]:
    """Return just the rows for direct pipeline consumption."""
    return DEMO_ROWS
