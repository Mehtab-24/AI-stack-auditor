"""Abstract base class for all pipeline agents.

Every agent follows the same contract:
  1. Has a canonical ``name``.
  2. Receives a **typed** Pydantic input.
  3. Returns a **typed** Pydantic output.
  4. Never calls another agent — orchestration is external.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from pydantic import BaseModel

from app.core.exceptions import AgentExecutionError
from app.core.logging import get_logger
from app.schemas.enums import AgentName
from app.schemas.report import AgentTraceStep

InputT = TypeVar("InputT", bound=BaseModel)
OutputT = TypeVar("OutputT", bound=BaseModel)


class BaseAgent(ABC, Generic[InputT, OutputT]):
    """Base class that every agent must extend.

    Subclasses implement ``_run`` with their domain logic.  The public
    ``execute`` method wraps ``_run`` with logging, timing, and error handling.
    """

    @property
    @abstractmethod
    def name(self) -> AgentName:
        """Canonical agent name (must be an ``AgentName`` enum member)."""
        ...

    @abstractmethod
    async def _run(self, input_data: InputT) -> OutputT:
        """Core agent logic — implemented by each concrete agent."""
        ...

    async def execute(self, input_data: InputT) -> tuple[OutputT, AgentTraceStep]:
        """Run the agent, returning both the result and a trace step.

        The trace step captures the agent's name, status, summary, and wall-
        clock duration for the Agent Trace Panel.
        """
        logger = get_logger(f"agent.{self.name.value}")
        logger.info("Starting execution")
        start = time.perf_counter()

        try:
            result = await self._run(input_data)
            elapsed_ms = (time.perf_counter() - start) * 1000
            summary = self._summarise(result)
            logger.info("Completed in %.1f ms — %s", elapsed_ms, summary)

            trace = AgentTraceStep(
                agent=self.name,
                status="completed",
                summary=summary,
                duration_ms=round(elapsed_ms, 1),
            )
            return result, trace

        except AgentExecutionError:
            raise
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.exception("Failed after %.1f ms", elapsed_ms)
            raise AgentExecutionError(
                agent_name=self.name.value,
                message=str(exc),
            ) from exc

    def _summarise(self, result: OutputT) -> str:
        """Generate a one-line summary for the trace panel.

        Override in subclasses for richer summaries.
        """
        return f"{self.name.value} completed successfully."
