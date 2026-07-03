"""Waste Detection Agent — finds duplicates, underused tools, and cost anomalies.

Responsibility:
    Analyse categorised tools for waste patterns: same-category duplicates,
    low seat utilisation, overpriced tiers, inactive seats, hidden add-ons
    that are underused, and upcoming renewals on low-usage tools.

Current implementation:
    Rule-based — deterministic thresholds for each finding type.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from app.agents.base import BaseAgent
from app.schemas.agent_io import WasteDetectionInput, WasteDetectionOutput
from app.schemas.enums import AgentName, FindingType
from app.schemas.finding import Finding
from app.schemas.tool import MappedTool

# Thresholds
_SEAT_UTILISATION_THRESHOLD = 0.50  # Flag if < 50% seats are active
_INACTIVE_SEAT_THRESHOLD = 0.25    # Flag as inactive seats if < 25% utilisation
_RENEWAL_WINDOW_DAYS = 30          # Flag renewals within this window


class WasteDetectionAgent(BaseAgent[WasteDetectionInput, WasteDetectionOutput]):
    """Detects waste, overlap, and cost anomalies in the tool stack."""

    @property
    def name(self) -> AgentName:
        return AgentName.WASTE_DETECTION

    async def _run(self, input_data: WasteDetectionInput) -> WasteDetectionOutput:
        findings: list[Finding] = []

        findings.extend(self._detect_duplicates(input_data.tools))
        findings.extend(self._detect_underused(input_data.tools))
        findings.extend(self._detect_inactive_seats(input_data.tools))
        findings.extend(self._detect_hidden_addon_waste(input_data.tools))
        findings.extend(self._detect_renewal_risks(input_data.tools))

        return WasteDetectionOutput(findings=findings)

    def _summarise(self, result: WasteDetectionOutput) -> str:
        by_type = defaultdict(int)
        for f in result.findings:
            by_type[f.finding_type.value] += 1
        parts = [f"{count} {ftype}" for ftype, count in sorted(by_type.items())]
        return f"Flagged {len(result.findings)} issues: {', '.join(parts)}" if parts else "No waste detected."

    # ── Detection rules ──────────────────────────────────────────────────────

    def _detect_duplicates(self, tools: list[MappedTool]) -> list[Finding]:
        """Flag same-category tools as potential duplicates."""
        findings: list[Finding] = []
        by_category: dict[str, list[MappedTool]] = defaultdict(list)

        for tool in tools:
            by_category[tool.category.value].append(tool)

        for category, group in by_category.items():
            if len(group) < 2:
                continue
            # Sort by active-seat utilisation descending
            ranked = sorted(group, key=lambda t: self._utilisation(t), reverse=True)
            primary = ranked[0]
            for duplicate in ranked[1:]:
                confidence = 0.85 if self._utilisation(duplicate) < _SEAT_UTILISATION_THRESHOLD else 0.60
                findings.append(
                    Finding(
                        tool_id=duplicate.id,
                        tool_name=duplicate.tool_name,
                        finding_type=FindingType.DUPLICATE,
                        description=(
                            f"{duplicate.tool_name} (${duplicate.monthly_cost}/mo) overlaps with "
                            f"{primary.tool_name} (${primary.monthly_cost}/mo) — both serve the "
                            f"same job: {category}. {primary.tool_name} has higher utilisation."
                        ),
                        confidence_score=confidence,
                        generated_by_agent=AgentName.WASTE_DETECTION,
                    )
                )
        return findings

    def _detect_underused(self, tools: list[MappedTool]) -> list[Finding]:
        """Flag tools with low seat utilisation."""
        findings: list[Finding] = []
        for tool in tools:
            util = self._utilisation(tool)
            if util >= _SEAT_UTILISATION_THRESHOLD or tool.seats_purchased <= 1:
                continue
            findings.append(
                Finding(
                    tool_id=tool.id,
                    tool_name=tool.tool_name,
                    finding_type=FindingType.UNDERUSED,
                    description=(
                        f"{tool.tool_name} has {tool.seats_active_estimated or 0} of "
                        f"{tool.seats_purchased} seats active ({util:.0%} utilisation). "
                        f"Consider downgrading to a smaller plan."
                    ),
                    confidence_score=0.80,
                    generated_by_agent=AgentName.WASTE_DETECTION,
                )
            )
        return findings

    def _detect_inactive_seats(self, tools: list[MappedTool]) -> list[Finding]:
        """Flag tools where the vast majority of seats are inactive."""
        findings: list[Finding] = []
        for tool in tools:
            util = self._utilisation(tool)
            if util >= _INACTIVE_SEAT_THRESHOLD or tool.seats_purchased <= 1:
                continue
            inactive = tool.seats_purchased - (tool.seats_active_estimated or 0)
            findings.append(
                Finding(
                    tool_id=tool.id,
                    tool_name=tool.tool_name,
                    finding_type=FindingType.INACTIVE_SEATS,
                    description=(
                        f"{tool.tool_name}: {inactive} of {tool.seats_purchased} seats appear "
                        f"inactive ({util:.0%} utilisation). Downgrade or cancel unused seats."
                    ),
                    confidence_score=0.90,
                    generated_by_agent=AgentName.WASTE_DETECTION,
                )
            )
        return findings

    def _detect_hidden_addon_waste(self, tools: list[MappedTool]) -> list[Finding]:
        """Flag hidden AI add-ons with low utilisation."""
        findings: list[Finding] = []
        for tool in tools:
            if not tool.is_ai_addon:
                continue
            util = self._utilisation(tool)
            if util < _SEAT_UTILISATION_THRESHOLD:
                findings.append(
                    Finding(
                        tool_id=tool.id,
                        tool_name=tool.tool_name,
                        finding_type=FindingType.HIDDEN_ADDON,
                        description=(
                            f"{tool.tool_name} (${tool.monthly_cost}/mo) is a hidden AI add-on "
                            f"with only {util:.0%} seat utilisation. Consider removing the add-on."
                        ),
                        confidence_score=0.75,
                        generated_by_agent=AgentName.WASTE_DETECTION,
                    )
                )
        return findings

    def _detect_renewal_risks(self, tools: list[MappedTool]) -> list[Finding]:
        """Flag tools with upcoming renewals and low usage."""
        findings: list[Finding] = []
        today = date.today()
        cutoff = today + timedelta(days=_RENEWAL_WINDOW_DAYS)

        for tool in tools:
            if tool.renewal_date is None or tool.renewal_date > cutoff:
                continue
            util = self._utilisation(tool)
            if util < _SEAT_UTILISATION_THRESHOLD:
                days_until = (tool.renewal_date - today).days
                findings.append(
                    Finding(
                        tool_id=tool.id,
                        tool_name=tool.tool_name,
                        finding_type=FindingType.RENEWAL_RISK,
                        description=(
                            f"{tool.tool_name} renews in {days_until} day{'s' if days_until != 1 else ''} "
                            f"with only {util:.0%} utilisation. Review before auto-renewal."
                        ),
                        confidence_score=0.85,
                        generated_by_agent=AgentName.WASTE_DETECTION,
                    )
                )
        return findings

    # ── Utility ──────────────────────────────────────────────────────────────

    @staticmethod
    def _utilisation(tool: MappedTool) -> float:
        """Seat utilisation ratio, 0.0–1.0.  Returns 1.0 if data is unavailable."""
        if tool.seats_purchased <= 0 or tool.seats_active_estimated is None:
            return 1.0
        return tool.seats_active_estimated / tool.seats_purchased
