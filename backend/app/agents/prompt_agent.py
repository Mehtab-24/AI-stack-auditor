"""Prompt Agent — analyses prompt patterns for optimisation opportunities.

Responsibility:
    Analyse tool usage patterns to identify prompt optimisation opportunities
    that could reduce costs or improve output quality.

Current implementation:
    Pass-through placeholder.  Reserved for future scope (see PRD §10).
    Returns an empty optimisations list so the pipeline contract is satisfied
    without affecting downstream agents.
"""

from __future__ import annotations

from app.agents.base import BaseAgent
from app.schemas.agent_io import PromptAnalysisInput, PromptAnalysisOutput
from app.schemas.enums import AgentName


class PromptAgent(BaseAgent[PromptAnalysisInput, PromptAnalysisOutput]):
    """Placeholder for future prompt-optimisation analysis."""

    @property
    def name(self) -> AgentName:
        return AgentName.PROMPT

    async def _run(self, input_data: PromptAnalysisInput) -> PromptAnalysisOutput:
        # Pass-through — no optimisations in current implementation.
        return PromptAnalysisOutput(optimizations=[])

    def _summarise(self, result: PromptAnalysisOutput) -> str:
        count = len(result.optimizations)
        if count == 0:
            return "No prompt optimisations identified (reserved for future scope)."
        return f"Identified {count} prompt optimisation{'s' if count != 1 else ''}."
