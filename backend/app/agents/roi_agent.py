"""ROI Intelligence Agent — scores business value vs. cost per tool.

Responsibility:
    Estimate productivity impact and business value for each tool so that
    expensive-but-justified tools aren't flagged as waste.

Current implementation:
    Deterministic heuristic based on seat utilisation, category importance
    weighting, and cost-per-active-seat efficiency.
"""

from __future__ import annotations

from app.agents.base import BaseAgent
from app.schemas.agent_io import ROIAnalysisInput, ROIAnalysisOutput
from app.schemas.enums import AgentName, ToolCategory
from app.schemas.roi import ROIScore
from app.schemas.tool import MappedTool

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


class ROIAgent(BaseAgent[ROIAnalysisInput, ROIAnalysisOutput]):
    """Scores each tool's business value relative to its cost."""

    @property
    def name(self) -> AgentName:
        return AgentName.ROI

    async def _run(self, input_data: ROIAnalysisInput) -> ROIAnalysisOutput:
        scores: list[ROIScore] = []
        for tool in input_data.tools:
            scores.append(self._score_tool(tool))
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

    # ── Scoring logic ────────────────────────────────────────────────────────

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

        # Business value narrative
        value_estimate = self._value_narrative(tool, roi, productivity)

        return ROIScore(
            tool_id=tool.id,
            tool_name=tool.tool_name,
            roi_score=roi,
            productivity_score=productivity,
            business_value_estimate=value_estimate,
            confidence_score=confidence,
        )

    def _value_narrative(self, tool: MappedTool, roi: float, productivity: float) -> str:
        """Generate a human-readable business-value explanation."""
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
