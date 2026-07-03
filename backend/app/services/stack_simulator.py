"""Stack Simulator service — independent "what-if" analysis.

Runs independently of the main audit pipeline.  Takes a current tool inventory
and a user-described hypothetical change, then estimates cost/impact without
writing to findings or recommendations.

Current implementation:
    Deterministic keyword-based heuristic.
"""

from __future__ import annotations

import re

from app.core.logging import get_logger
from app.schemas.simulation import SimulationRequest, SimulationResult
from app.schemas.tool import MappedTool

logger = get_logger("services.stack_simulator")


class StackSimulatorService:
    """Simulate hypothetical changes to the tool stack."""

    async def simulate(self, request: SimulationRequest) -> SimulationResult:
        """Run a simulation against the provided tools and hypothetical.

        Parameters
        ----------
        request:
            The simulation request containing the current tool list and the
            natural-language hypothetical to evaluate.

        Returns
        -------
        SimulationResult
            Ephemeral result — not persisted.
        """
        original_cost = sum(t.monthly_cost for t in request.tools)
        hypothetical = request.hypothetical.lower().strip()

        # Dispatch to the appropriate handler
        if self._is_replace_scenario(hypothetical):
            return self._handle_replace(request.tools, hypothetical, original_cost)
        if self._is_reduce_scenario(hypothetical):
            return self._handle_reduce(request.tools, hypothetical, original_cost)
        if self._is_remove_scenario(hypothetical):
            return self._handle_remove(request.tools, hypothetical, original_cost)

        # Generic fallback
        return self._handle_generic(request.tools, hypothetical, original_cost)

    # ── Scenario detection ───────────────────────────────────────────────────

    @staticmethod
    def _is_replace_scenario(text: str) -> bool:
        return any(kw in text for kw in ["replace", "swap", "switch", "migrate"])

    @staticmethod
    def _is_reduce_scenario(text: str) -> bool:
        return any(kw in text for kw in ["reduce", "cut", "decrease", "lower"])

    @staticmethod
    def _is_remove_scenario(text: str) -> bool:
        return any(kw in text for kw in ["remove", "cancel", "drop", "eliminate"])

    # ── Handlers ─────────────────────────────────────────────────────────────

    def _handle_replace(
        self, tools: list[MappedTool], hypothetical: str, original_cost: float
    ) -> SimulationResult:
        """Estimate impact of replacing one tool with another."""
        # Try to extract "replace X with Y"
        match = re.search(r"(?:replace|swap|switch)\s+(.+?)\s+(?:with|for|to)\s+(.+)", hypothetical)
        if not match:
            return self._handle_generic(tools, hypothetical, original_cost)

        old_name = match.group(1).strip()
        new_name = match.group(2).strip()

        # Find the tool being replaced
        replaced = self._find_tool(tools, old_name)
        if replaced is None:
            return SimulationResult(
                original_monthly_cost=original_cost,
                predicted_monthly_cost=original_cost,
                predicted_annual_cost=original_cost * 12,
                savings_delta=0.0,
                productivity_impact="Tool not found in current stack.",
                risk_score=2.0,
                recommendation=f"Could not find '{old_name}' in the current tool inventory.",
            )

        # Estimate new cost (assume replacement is ~70% of original cost as a heuristic)
        estimated_new_cost = replaced.monthly_cost * 0.7
        predicted = original_cost - replaced.monthly_cost + estimated_new_cost
        delta = original_cost - predicted

        return SimulationResult(
            original_monthly_cost=original_cost,
            predicted_monthly_cost=round(predicted, 2),
            predicted_annual_cost=round(predicted * 12, 2),
            savings_delta=round(delta, 2),
            productivity_impact=(
                f"Replacing {replaced.tool_name} with {new_name} — "
                f"estimated ${delta:,.0f}/mo savings. "
                f"Productivity impact depends on feature parity; recommend a trial period."
            ),
            risk_score=4.5,
            recommendation=(
                f"Consider trialling {new_name} with a small team before full migration. "
                f"Estimated savings: ${delta:,.0f}/mo (${delta * 12:,.0f}/yr)."
            ),
        )

    def _handle_reduce(
        self, tools: list[MappedTool], hypothetical: str, original_cost: float
    ) -> SimulationResult:
        """Estimate impact of a percentage spend reduction."""
        # Try to extract a percentage
        match = re.search(r"(\d+)\s*%", hypothetical)
        pct = int(match.group(1)) / 100 if match else 0.20

        target_reduction = original_cost * pct
        predicted = original_cost - target_reduction

        return SimulationResult(
            original_monthly_cost=original_cost,
            predicted_monthly_cost=round(predicted, 2),
            predicted_annual_cost=round(predicted * 12, 2),
            savings_delta=round(target_reduction, 2),
            productivity_impact=(
                f"A {pct:.0%} spend reduction (${target_reduction:,.0f}/mo) would require "
                f"cancelling or downgrading {max(1, int(len(tools) * pct))} tool(s). "
                f"Prioritise low-ROI and underused subscriptions."
            ),
            risk_score=round(min(pct * 15, 9.0), 1),
            recommendation=(
                f"Target the lowest-ROI tools first. A {pct:.0%} cut is "
                + ("achievable with minimal disruption." if pct <= 0.20 else "aggressive — plan carefully.")
            ),
        )

    def _handle_remove(
        self, tools: list[MappedTool], hypothetical: str, original_cost: float
    ) -> SimulationResult:
        """Estimate impact of removing a specific tool."""
        # Try to extract tool name after the action verb
        match = re.search(r"(?:remove|cancel|drop|eliminate)\s+(.+)", hypothetical)
        tool_name = match.group(1).strip() if match else hypothetical

        removed = self._find_tool(tools, tool_name)
        if removed is None:
            return SimulationResult(
                original_monthly_cost=original_cost,
                predicted_monthly_cost=original_cost,
                predicted_annual_cost=original_cost * 12,
                savings_delta=0.0,
                productivity_impact="Tool not found in current stack.",
                risk_score=2.0,
                recommendation=f"Could not find '{tool_name}' in the current tool inventory.",
            )

        predicted = original_cost - removed.monthly_cost
        return SimulationResult(
            original_monthly_cost=original_cost,
            predicted_monthly_cost=round(predicted, 2),
            predicted_annual_cost=round(predicted * 12, 2),
            savings_delta=round(removed.monthly_cost, 2),
            productivity_impact=(
                f"Removing {removed.tool_name} saves ${removed.monthly_cost:,.0f}/mo. "
                f"This affects {removed.seats_active_estimated or removed.seats_purchased} "
                f"active user(s) in {removed.category.value}."
            ),
            risk_score=5.0,
            recommendation=(
                f"Ensure {removed.category.value} workflows are covered by remaining tools "
                f"before cancelling {removed.tool_name}."
            ),
        )

    @staticmethod
    def _handle_generic(
        tools: list[MappedTool], hypothetical: str, original_cost: float
    ) -> SimulationResult:
        """Fallback for unrecognised scenarios."""
        return SimulationResult(
            original_monthly_cost=original_cost,
            predicted_monthly_cost=original_cost,
            predicted_annual_cost=original_cost * 12,
            savings_delta=0.0,
            productivity_impact=(
                f"Could not parse a specific scenario from: '{hypothetical}'. "
                f"Try phrases like 'replace X with Y', 'reduce spend by 20%', or 'remove X'."
            ),
            risk_score=3.0,
            recommendation="Rephrase the scenario using replace, reduce, or remove keywords.",
        )

    @staticmethod
    def _find_tool(tools: list[MappedTool], name: str) -> MappedTool | None:
        """Case-insensitive tool lookup by name substring."""
        normalised = name.lower()
        for t in tools:
            if t.tool_name.lower() == normalised:
                return t
        for t in tools:
            if normalised in t.tool_name.lower() or t.tool_name.lower() in normalised:
                return t
        return None
