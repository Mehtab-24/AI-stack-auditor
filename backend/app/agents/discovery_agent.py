"""Discovery Agent — extracts AI-related tools from raw input data.

Responsibility:
    Parse raw CSV row dicts and produce a structured list of DiscoveredTools.
    Identify hidden AI add-ons bundled inside larger SaaS line items.

Current implementation:
    Deterministic rule-based extraction.  Designed to be replaceable with
    advanced reasoning without changing the I/O contract.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from app.agents.base import BaseAgent
from app.schemas.agent_io import DiscoveryInput, DiscoveryOutput
from app.schemas.enums import AgentName, ToolSource
from app.schemas.tool import DiscoveredTool
from app.utils.knowledge_base import lookup_tool

# Keywords that signal an AI-related tool or add-on
_AI_KEYWORDS: set[str] = {
    "ai", "ml", "gpt", "copilot", "assistant", "intelligence",
    "autopilot", "bot", "neural", "llm", "genai", "generative",
    "magic", "genius", "smart", "auto-complete", "autocomplete",
}

_ADDON_KEYWORDS: set[str] = {"add-on", "addon", "plugin", "extension", "boost", "premium ai"}


class DiscoveryAgent(BaseAgent[DiscoveryInput, DiscoveryOutput]):
    """Scans raw rows and extracts AI tools + hidden add-ons."""

    @property
    def name(self) -> AgentName:
        return AgentName.DISCOVERY

    async def _run(self, input_data: DiscoveryInput) -> DiscoveryOutput:
        tools: list[DiscoveredTool] = []

        for row in input_data.raw_rows:
            tool = self._row_to_tool(row)
            if tool is not None:
                tools.append(tool)

        return DiscoveryOutput(tools=tools)

    def _summarise(self, result: DiscoveryOutput) -> str:
        addon_count = sum(1 for t in result.tools if t.is_ai_addon)
        vendors = {t.vendor for t in result.tools}
        return (
            f"Found {len(result.tools)} AI tools across {len(vendors)} vendors"
            f" ({addon_count} hidden add-on{'s' if addon_count != 1 else ''})"
        )

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _row_to_tool(self, row: dict[str, Any]) -> DiscoveredTool | None:
        """Convert a single CSV row dict into a DiscoveredTool, or None."""
        tool_name = str(row.get("tool_name", "")).strip()
        if not tool_name:
            return None

        vendor = str(row.get("vendor", "")).strip()
        if not vendor:
            # Try to infer vendor from tool name using the knowledge base
            known = lookup_tool(tool_name)
            if known:
                vendor = known.tool_name.split()[0]
            else:
                vendor = tool_name.split()[0] if tool_name.split() else "Unknown"

        try:
            monthly_cost = float(row.get("monthly_cost", 0))
        except (ValueError, TypeError):
            return None

        # Determine if this is an AI tool (check knowledge base first, then keywords)
        is_known = lookup_tool(tool_name) is not None
        is_keyword_match = self._matches_ai_keywords(tool_name)

        if not is_known and not is_keyword_match:
            return None

        is_addon = self._is_hidden_addon(tool_name)

        # Parse optional fields safely
        seats_purchased = self._safe_int(row.get("seats_purchased"), default=1)
        seats_active = self._safe_int(row.get("seats_active_estimated"))
        renewal = self._safe_date(row.get("renewal_date"))
        plan_tier = str(row.get("plan_tier", "standard")).strip() or "standard"

        # Explicit is_ai_addon column overrides heuristic
        explicit_addon = row.get("is_ai_addon")
        if explicit_addon is not None:
            is_addon = str(explicit_addon).strip().lower() in {"true", "1", "yes"}

        return DiscoveredTool(
            tool_name=tool_name,
            vendor=vendor,
            monthly_cost=monthly_cost,
            plan_tier=plan_tier,
            seats_purchased=seats_purchased,
            seats_active_estimated=seats_active,
            is_ai_addon=is_addon,
            source=ToolSource.CSV,
            renewal_date=renewal,
        )

    @staticmethod
    def _matches_ai_keywords(name: str) -> bool:
        lower = name.lower()
        return any(kw in lower for kw in _AI_KEYWORDS)

    @staticmethod
    def _is_hidden_addon(name: str) -> bool:
        lower = name.lower()
        return any(kw in lower for kw in _ADDON_KEYWORDS)

    @staticmethod
    def _safe_int(value: Any, default: int | None = None) -> int | None:
        if value is None:
            return default
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _safe_date(value: Any) -> date | None:
        if value is None:
            return None
        try:
            return date.fromisoformat(str(value).strip())
        except (ValueError, TypeError):
            return None
