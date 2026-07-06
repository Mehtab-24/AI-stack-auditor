"""Waste Detection Agent — finds duplicates, underused tools, and cost anomalies.

Responsibility:
    Analyse categorised tools for waste patterns: same-category duplicates,
    low seat utilisation, overpriced tiers, inactive seats, hidden add-ons
    that are underused, and upcoming renewals on low-usage tools.

Implementation:
    - Rules 1–2, 4–6 are deterministic (fast, no API calls).
    - Rule 3 (overpriced_tier) uses a heuristic pre-filter then an LLM call,
      since "is this tier justified" is explicitly a judgment call per
      BUILD_PLAN §4 — usage patterns vary too much for a single threshold.
    - If the LLM is disabled, overpriced_tier detection is skipped for that
      tool rather than generating a false positive.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from app.agents.base import BaseAgent
from app.schemas.agent_io import WasteDetectionInput, WasteDetectionOutput
from app.schemas.enums import AgentName, FindingType
from app.schemas.finding import Finding
from app.schemas.tool import MappedTool
from app.services.llm_client import get_llm_client
from app.utils.knowledge_base import lookup_tool

# Thresholds
_SEAT_UTILISATION_THRESHOLD = 0.50   # Flag if < 50% seats are active
_INACTIVE_SEAT_THRESHOLD = 0.25     # Flag as inactive seats if < 25% utilisation
_RENEWAL_WINDOW_DAYS = 30            # Flag renewals within this window

# Tiers considered "premium" — these go through overpriced_tier analysis
_PREMIUM_TIERS: set[str] = {"enterprise", "premium", "pro", "business", "team"}

_LLM_SCHEMA_HINT = """{
  "is_overpriced": "boolean — true if this plan tier is unjustified given actual usage",
  "reason": "string — 1-2 sentence explanation referencing actual seat usage and market pricing",
  "confidence": "number between 0.0 and 1.0"
}"""


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
        # LLM-backed overpriced-tier detection runs last (may make API calls)
        findings.extend(await self._detect_overpriced_tier(input_data.tools))

        return WasteDetectionOutput(findings=findings)

    def _summarise(self, result: WasteDetectionOutput) -> str:
        by_type: dict[str, int] = defaultdict(int)
        for f in result.findings:
            by_type[f.finding_type.value] += 1
        parts = [f"{count} {ftype}" for ftype, count in sorted(by_type.items())]
        return f"Flagged {len(result.findings)} issues: {', '.join(parts)}" if parts else "No waste detected."

    # ── Rule-based detection ─────────────────────────────────────────────────

    def _detect_duplicates(self, tools: list[MappedTool]) -> list[Finding]:
        """Flag same-category tools as potential duplicates."""
        findings: list[Finding] = []
        by_category: dict[str, list[MappedTool]] = defaultdict(list)

        for tool in tools:
            by_category[tool.category.value].append(tool)

        for category, group in by_category.items():
            if len(group) < 2:
                continue
            # Sort by active-seat utilisation descending — highest utilisation = primary
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

    # ── LLM-backed overpriced-tier detection ─────────────────────────────────

    async def _detect_overpriced_tier(self, tools: list[MappedTool]) -> list[Finding]:
        """Flag tools on premium/enterprise tiers that don't justify the cost.

        Pre-filter: only tools whose plan_tier is a known premium tier AND whose
        seat utilisation is below 60% are sent to the LLM for judgment.
        This keeps LLM call volume low while targeting the right candidates.
        """
        llm = get_llm_client()
        findings: list[Finding] = []

        for tool in tools:
            # Pre-filter 1: must be a premium-tier plan
            if tool.plan_tier.lower() not in _PREMIUM_TIERS:
                continue

            # Pre-filter 2: must have mediocre or poor utilisation
            util = self._utilisation(tool)
            if util >= 0.60:
                continue  # Well-utilised premium tiers are not candidates

            # Pre-filter 3: cost must be above a minimal threshold
            if tool.monthly_cost < 50:
                continue  # Very cheap tools aren't worth flagging as "overpriced tier"

            if not llm.is_enabled:
                # Without LLM we can't make a judgment call — skip rather than false-positive
                continue

            finding = await self._llm_judge_overpriced(llm, tool, util)
            if finding:
                findings.append(finding)

        return findings

    async def _llm_judge_overpriced(
        self, llm: object, tool: MappedTool, utilisation: float
    ) -> Finding | None:
        """Call LLM to judge whether a specific tool's tier is unjustified."""
        from app.services.llm_client import GeminiClient
        assert isinstance(llm, GeminiClient)

        # Retrieve KB pricing reference if available
        kb_entry = lookup_tool(tool.tool_name)
        price_context = (
            f"Typical market price range for this tool: {kb_entry.typical_price_range}"
            if kb_entry else "No market pricing data available."
        )

        prompt = (
            f"You are evaluating whether an AI tool subscription is on an unjustifiably expensive tier.\n\n"
            f"Tool: {tool.tool_name}\n"
            f"Vendor: {tool.vendor}\n"
            f"Plan tier: {tool.plan_tier}\n"
            f"Monthly cost: ${tool.monthly_cost}\n"
            f"Seats purchased: {tool.seats_purchased}\n"
            f"Seats actively used: {tool.seats_active_estimated or 'Unknown'}\n"
            f"Seat utilisation: {utilisation:.0%}\n"
            f"Business category: {tool.category.value}\n"
            f"{price_context}\n\n"
            f"Is this subscription on an overpriced tier given the actual usage?\n"
            f"Consider: seat utilisation, cost vs. market pricing, and whether a cheaper tier would suffice."
        )

        result = await llm.generate_json(prompt, schema_hint=_LLM_SCHEMA_HINT)
        if result is None:
            return None

        is_overpriced = bool(result.get("is_overpriced", False))
        if not is_overpriced:
            return None

        reason = str(result.get("reason", "")).strip()
        confidence = float(result.get("confidence", 0.70))
        confidence = max(0.0, min(1.0, confidence))

        if not reason:
            reason = (
                f"{tool.tool_name} is on the {tool.plan_tier} tier at ${tool.monthly_cost}/mo "
                f"with only {utilisation:.0%} seat utilisation — a lower tier may suffice."
            )

        return Finding(
            tool_id=tool.id,
            tool_name=tool.tool_name,
            finding_type=FindingType.OVERPRICED_TIER,
            description=reason,
            confidence_score=confidence,
            generated_by_agent=AgentName.WASTE_DETECTION,
        )

    # ── Utility ──────────────────────────────────────────────────────────────

    @staticmethod
    def _utilisation(tool: MappedTool) -> float:
        """Seat utilisation ratio, 0.0–1.0.  Returns 1.0 if data is unavailable."""
        if tool.seats_purchased <= 0 or tool.seats_active_estimated is None:
            return 1.0
        return tool.seats_active_estimated / tool.seats_purchased
