"""Action Agent — compiles findings and recommendations into a final report.

Responsibility:
    Aggregate all upstream results into a manager-ready AuditReport.
    Compute total savings.  Never auto-execute any action.

Current implementation:
    Deterministic aggregation — no reasoning required.
"""

from __future__ import annotations

from app.agents.base import BaseAgent
from app.schemas.agent_io import ActionInput, ActionOutput
from app.schemas.enums import ActionType, AgentName
from app.schemas.report import AuditReport


class ActionAgent(BaseAgent[ActionInput, ActionOutput]):
    """Compiles the final audit report from all upstream data."""

    @property
    def name(self) -> AgentName:
        return AgentName.ACTION

    async def _run(self, input_data: ActionInput) -> ActionOutput:
        total_monthly = sum(
            r.estimated_monthly_savings
            for r in input_data.recommendations
            if r.action_type != ActionType.RETAIN
        )
        total_annual = total_monthly * 12

        flagged_tool_ids = {
            str(f.tool_id)
            for f in input_data.findings
            if f.tool_id is not None
        }

        report = AuditReport(
            tools=input_data.tools,
            findings=input_data.findings,
            roi_scores=input_data.roi_scores,
            recommendations=input_data.recommendations,
            total_monthly_savings=round(total_monthly, 2),
            total_annual_savings=round(total_annual, 2),
            tools_discovered=len(input_data.tools),
            tools_flagged=len(flagged_tool_ids),
        )

        return ActionOutput(report=report)

    def _summarise(self, result: ActionOutput) -> str:
        r = result.report
        return (
            f"Draft report ready — ${r.total_monthly_savings:,.0f}/mo "
            f"(${r.total_annual_savings:,.0f}/yr) potential savings across "
            f"{r.tools_flagged} flagged tool{'s' if r.tools_flagged != 1 else ''}"
        )
