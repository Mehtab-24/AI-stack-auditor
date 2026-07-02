"""AI Router Agent — recommends optimal model routing per tool.

Responsibility:
    Analyse tools and their ROI scores to suggest optimal routing strategies
    (e.g. cheaper models for low-complexity workloads).

Current implementation:
    Pass-through placeholder.  Reserved for future scope (see PRD §10).
    Returns an empty suggestions list so the pipeline contract is satisfied
    without affecting downstream agents.
"""

from __future__ import annotations

from app.agents.base import BaseAgent
from app.schemas.agent_io import AIRouterInput, AIRouterOutput
from app.schemas.enums import AgentName


class AIRouterAgent(BaseAgent[AIRouterInput, AIRouterOutput]):
    """Placeholder for future model-routing optimisation."""

    @property
    def name(self) -> AgentName:
        return AgentName.AI_ROUTER

    async def _run(self, input_data: AIRouterInput) -> AIRouterOutput:
        # Pass-through — no routing suggestions in current implementation.
        return AIRouterOutput(routing_suggestions=[])

    def _summarise(self, result: AIRouterOutput) -> str:
        count = len(result.routing_suggestions)
        if count == 0:
            return "No routing optimisations identified (reserved for future scope)."
        return f"Identified {count} routing suggestion{'s' if count != 1 else ''}."
