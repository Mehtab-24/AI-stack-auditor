"""Recommendation Agent — proposes retain/downgrade/cancel/consolidate actions.

Responsibility:
    For each finding, produce a concrete recommendation that accounts for both
    the waste signal AND the tool's ROI score — so high-value tools aren't
    blindly flagged for cancellation.

Current implementation:
    Deterministic rule-based logic.  Maps finding types to default actions,
    then cross-checks ROI scores to override cancellations on high-value tools.
"""

from __future__ import annotations

from app.agents.base import BaseAgent
from app.schemas.agent_io import RecommendationInput, RecommendationOutput
from app.schemas.enums import ActionType, AgentName, FindingType
from app.schemas.finding import Finding
from app.schemas.recommendation import Recommendation
from app.schemas.roi import ROIScore
from app.schemas.tool import MappedTool
from app.utils.knowledge_base import get_alternatives_for

# Default action for each finding type (before ROI cross-check)
_DEFAULT_ACTIONS: dict[FindingType, ActionType] = {
    FindingType.DUPLICATE: ActionType.CONSOLIDATE,
    FindingType.UNDERUSED: ActionType.DOWNGRADE,
    FindingType.OVERPRICED_TIER: ActionType.CANCEL,
    FindingType.INACTIVE_SEATS: ActionType.DOWNGRADE,
    FindingType.HIDDEN_ADDON: ActionType.CANCEL,
    FindingType.RENEWAL_RISK: ActionType.REVIEW_RENEWAL,
}

# ROI threshold — tools above this are retained even if flagged
_HIGH_ROI_THRESHOLD = 7.0


class RecommendationAgent(BaseAgent[RecommendationInput, RecommendationOutput]):
    """Produces actionable recommendations from findings + ROI scores."""

    @property
    def name(self) -> AgentName:
        return AgentName.RECOMMENDATION

    async def _run(self, input_data: RecommendationInput) -> RecommendationOutput:
        # Build lookup maps
        roi_by_tool: dict[str, ROIScore] = {
            str(s.tool_id): s for s in input_data.roi_scores
        }
        tool_by_id: dict[str, MappedTool] = {
            str(t.id): t for t in input_data.tools
        }

        recommendations: list[Recommendation] = []
        for finding in input_data.findings:
            rec = self._recommend(finding, roi_by_tool, tool_by_id)
            recommendations.append(rec)

        return RecommendationOutput(recommendations=recommendations)

    def _summarise(self, result: RecommendationOutput) -> str:
        total_savings = sum(r.estimated_monthly_savings for r in result.recommendations)
        retained = sum(1 for r in result.recommendations if r.action_type == ActionType.RETAIN)
        return (
            f"Generated {len(result.recommendations)} recommendations — "
            f"${total_savings:,.0f}/mo potential savings"
            + (f", {retained} tool{'s' if retained != 1 else ''} retained despite cost" if retained else "")
        )

    # ── Recommendation logic ─────────────────────────────────────────────────

    def _recommend(
        self,
        finding: Finding,
        roi_by_tool: dict[str, ROIScore],
        tool_by_id: dict[str, MappedTool],
    ) -> Recommendation:
        tool_id_str = str(finding.tool_id) if finding.tool_id else ""
        tool = tool_by_id.get(tool_id_str)
        roi = roi_by_tool.get(tool_id_str)

        # Start with the default action for this finding type
        action = _DEFAULT_ACTIONS.get(finding.finding_type, ActionType.REVIEW_RENEWAL)

        # Cross-check ROI: if the tool has high business value, retain it
        override_reason = ""
        if roi and roi.roi_score >= _HIGH_ROI_THRESHOLD and action in {ActionType.CANCEL, ActionType.CONSOLIDATE}:
            action = ActionType.RETAIN
            override_reason = (
                f" ROI score ({roi.roi_score}/10) indicates high business value — "
                f"retaining despite {finding.finding_type.value} flag."
            )

        # Compute savings estimate
        monthly_savings = self._estimate_savings(action, tool, finding)
        annual_savings = monthly_savings * 12

        # Find alternative
        alternative = self._suggest_alternative(action, tool, finding)

        # Build rationale
        rationale = self._build_rationale(action, finding, tool, roi, override_reason)

        return Recommendation(
            finding_id=finding.id,
            tool_name=finding.tool_name or (tool.tool_name if tool else "Unknown"),
            action_type=action,
            suggested_alternative=alternative,
            rationale=rationale,
            estimated_monthly_savings=monthly_savings,
            estimated_annual_savings=annual_savings,
        )

    def _estimate_savings(
        self,
        action: ActionType,
        tool: MappedTool | None,
        finding: Finding,
    ) -> float:
        """Estimate monthly savings based on the recommended action."""
        if tool is None:
            return 0.0

        if action == ActionType.RETAIN:
            return 0.0
        if action == ActionType.CANCEL:
            return tool.monthly_cost
        if action == ActionType.CONSOLIDATE:
            return tool.monthly_cost
        if action == ActionType.DOWNGRADE:
            # Estimate savings from right-sizing seats
            if tool.seats_active_estimated is not None and tool.seats_purchased > 0:
                unused_ratio = 1 - (tool.seats_active_estimated / tool.seats_purchased)
                return round(tool.monthly_cost * unused_ratio, 2)
            return round(tool.monthly_cost * 0.3, 2)
        if action == ActionType.REVIEW_RENEWAL:
            return round(tool.monthly_cost * 0.5, 2)
        return 0.0

    @staticmethod
    def _suggest_alternative(
        action: ActionType,
        tool: MappedTool | None,
        finding: Finding,
    ) -> str | None:
        """Look up a cheaper alternative from the knowledge base."""
        if action == ActionType.RETAIN:
            return None
        if tool is None:
            return None

        alternatives = get_alternatives_for(tool.tool_name)
        if alternatives:
            return alternatives[0]
        return None

    @staticmethod
    def _build_rationale(
        action: ActionType,
        finding: Finding,
        tool: MappedTool | None,
        roi: ROIScore | None,
        override_reason: str,
    ) -> str:
        """Build a human-readable rationale for the recommendation."""
        parts: list[str] = []

        if action == ActionType.RETAIN:
            parts.append(f"Retain {finding.tool_name}.")
            if override_reason:
                parts.append(override_reason.strip())
        elif action == ActionType.CANCEL:
            parts.append(f"Cancel {finding.tool_name} — {finding.description}")
        elif action == ActionType.CONSOLIDATE:
            parts.append(f"Consolidate {finding.tool_name} into an existing tool — {finding.description}")
        elif action == ActionType.DOWNGRADE:
            parts.append(f"Downgrade {finding.tool_name} to match actual usage — {finding.description}")
        elif action == ActionType.REVIEW_RENEWAL:
            parts.append(f"Review renewal for {finding.tool_name} before auto-renewing — {finding.description}")

        return " ".join(parts)
