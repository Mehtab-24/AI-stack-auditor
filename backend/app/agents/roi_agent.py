"""ROI Intelligence Agent — scores business value vs. cost per tool.

Responsibility:
    Estimate productivity impact and business value for each tool so that
    expensive-but-justified tools aren't flagged as waste.

Implementation:
    1. Heuristic scoring (utilisation × category weight × cost efficiency)
       always runs — it's fast, deterministic, and never fails.
    2. LLM call (Gemini) enriches ``business_value_estimate`` with a
       natural-language justification grounded in actual tool data.
       If the LLM is disabled or returns None, the heuristic narrative is
       used as a fallback — the score itself is never affected.
"""

from __future__ import annotations

from app.agents.base import BaseAgent
from app.schemas.agent_io import ROIAnalysisInput, ROIAnalysisOutput
from app.schemas.enums import AgentName, ToolCategory
from app.schemas.roi import ROIScore
from app.schemas.tool import MappedTool
from app.services.llm_client import get_llm_client

# Category importance weights (higher = more critical to business operations)
_CATEGORY_WEIGHTS: dict[ToolCategory, float] = {
    ToolCategory.CODING: 0.90,
    ToolCategory.SUPPORT: 0.85,
    ToolCategory.ANALYTICS: 0.80,
    ToolCategory.SEARCH: 0.75,
    ToolCategory.MEETINGS: 0.70,
    ToolCategory.WRITING: 0.65,
    ToolCategory.DESIGN: 0.60,
    ToolCategory.UNKNOWN: 0.40,
}

_LLM_SCHEMA_HINT = """{
  "business_value_estimate": "string — 1 to 2 sentences explaining why this tool's ROI score is justified"
}"""


class ROIAgent(BaseAgent[ROIAnalysisInput, ROIAnalysisOutput]):
    """Scores each tool's business value relative to its cost."""

    @property
    def name(self) -> AgentName:
        return AgentName.ROI

    async def _run(self, input_data: ROIAnalysisInput) -> ROIAnalysisOutput:
        llm = get_llm_client()
        scores: list[ROIScore] = []

        for tool in input_data.tools:
            score = self._score_tool(tool)

            # Enrich narrative with LLM if available
            if llm.is_enabled:
                llm_narrative = await self._generate_llm_narrative(llm, tool, score)
                if llm_narrative:
                    score.business_value_estimate = llm_narrative

            scores.append(score)

        return ROIAnalysisOutput(scores=scores)

    def _summarise(self, result: ROIAnalysisOutput) -> str:
        if not result.scores:
            return "No tools to score."
        high_roi = [s for s in result.scores if s.roi_score >= 7.0]
        low_roi = [s for s in result.scores if s.roi_score < 4.0]
        return (
            f"Scored {len(result.scores)} tools — "
            f"{len(high_roi)} high-ROI, {len(low_roi)} low-ROI"
        )

    # ── Heuristic scoring ────────────────────────────────────────────────────

    def _score_tool(self, tool: MappedTool) -> ROIScore:
        utilisation = self._utilisation(tool)
        category_weight = _CATEGORY_WEIGHTS.get(tool.category, 0.40)

        # Productivity: high utilisation × category importance → high productivity
        productivity = round(utilisation * category_weight * 10, 1)
        productivity = min(productivity, 10.0)

        # Cost efficiency: lower cost-per-active-seat → higher efficiency
        cost_efficiency = self._cost_efficiency(tool)

        # ROI: blend of productivity and cost efficiency
        roi = round((productivity * 0.6 + cost_efficiency * 0.4), 1)
        roi = min(roi, 10.0)

        # Confidence is higher when we have seat data
        confidence = 0.85 if tool.seats_active_estimated is not None else 0.50

        # Heuristic fallback narrative (replaced by LLM if available)
        value_estimate = self._heuristic_narrative(tool, roi)

        return ROIScore(
            tool_id=tool.id,
            tool_name=tool.tool_name,
            roi_score=roi,
            productivity_score=productivity,
            business_value_estimate=value_estimate,
            confidence_score=confidence,
        )

    # ── LLM narrative generation ─────────────────────────────────────────────

    async def _generate_llm_narrative(
        self, llm: object, tool: MappedTool, score: ROIScore
    ) -> str | None:
        """Ask Gemini to write a business-value justification for this tool's score."""
        from app.services.llm_client import GeminiClient
        assert isinstance(llm, GeminiClient)

        util = self._utilisation(tool)
        prompt = (
            f"You are writing a concise business-value assessment for an AI tool subscription.\n\n"
            f"Tool: {tool.tool_name} (vendor: {tool.vendor})\n"
            f"Business category: {tool.category.value}\n"
            f"Monthly cost: ${tool.monthly_cost}\n"
            f"Seats purchased: {tool.seats_purchased}\n"
            f"Seats actively used: {tool.seats_active_estimated or 'Unknown'}\n"
            f"Seat utilisation: {util:.0%}\n"
            f"ROI score: {score.roi_score}/10\n"
            f"Productivity score: {score.productivity_score}/10\n\n"
            f"Write 1–2 sentences explaining WHY this ROI score is justified "
            f"for this specific tool. Be specific — mention actual numbers. "
            f"If ROI is high, explain what justifies the cost. "
            f"If ROI is low, explain what's driving the low score."
        )

        result = await llm.generate_json(prompt, schema_hint=_LLM_SCHEMA_HINT)
        if result is None:
            return None

        narrative = str(result.get("business_value_estimate", "")).strip()
        return narrative if narrative else None

    # ── Heuristic helpers ────────────────────────────────────────────────────

    def _heuristic_narrative(self, tool: MappedTool, roi: float) -> str:
        """Fallback business-value explanation used when LLM is unavailable."""
        util = self._utilisation(tool)

        if roi >= 7.0:
            return (
                f"{tool.tool_name} shows strong ROI ({roi}/10). "
                f"High utilisation ({util:.0%}) across {tool.seats_active_estimated or tool.seats_purchased} "
                f"active seats in {tool.category.value} justifies the ${tool.monthly_cost}/mo cost."
            )
        if roi >= 4.0:
            return (
                f"{tool.tool_name} has moderate ROI ({roi}/10). "
                f"Usage is {util:.0%} — consider right-sizing the plan to improve cost efficiency."
            )
        return (
            f"{tool.tool_name} has low ROI ({roi}/10). "
            f"Only {util:.0%} of seats are active. Evaluate whether this tool is still needed."
        )

    @staticmethod
    def _utilisation(tool: MappedTool) -> float:
        if tool.seats_purchased <= 0 or tool.seats_active_estimated is None:
            return 1.0
        return tool.seats_active_estimated / tool.seats_purchased

    @staticmethod
    def _cost_efficiency(tool: MappedTool) -> float:
        """Score 0–10 based on cost per active seat.  Lower cost → higher score."""
        active = tool.seats_active_estimated or tool.seats_purchased
        if active <= 0:
            return 1.0
        cost_per_seat = tool.monthly_cost / active
        # Scale: $0 → 10, $100+ → ~2
        efficiency = max(10.0 - (cost_per_seat / 12.0), 1.0)
        return round(min(efficiency, 10.0), 1)
