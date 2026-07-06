"""Agent Orchestrator — runs the full audit pipeline.

Executes agents in the defined order, threading each agent's output into the
next agent's input.  Collects trace steps for the transparency view.

Pipeline:
    Discovery → Job-Mapping → Waste Detection ─┐
                                                ├─(concurrent)─▶ Recommendation → Action
                             ROI Intelligence ──┘
"""

from __future__ import annotations

import asyncio
from typing import Any

from app.agents.action_agent import ActionAgent
from app.agents.discovery_agent import DiscoveryAgent
from app.agents.job_mapping_agent import JobMappingAgent
from app.agents.recommendation_agent import RecommendationAgent
from app.agents.roi_agent import ROIAgent
from app.agents.waste_detection_agent import WasteDetectionAgent
from app.core.exceptions import OrchestrationError
from app.core.logging import get_logger
from app.schemas.agent_io import (
    ActionInput,
    DiscoveryInput,
    JobMappingInput,
    RecommendationInput,
    ROIAnalysisInput,
    WasteDetectionInput,
)
from app.schemas.report import AgentTraceStep, AuditReport
from app.utils.knowledge_base import get_knowledge_base

logger = get_logger("services.orchestrator")


class AgentOrchestrator:
    """Central orchestrator that sequences the agent pipeline.

    Each agent is instantiated once and reused across audit runs.
    The orchestrator never holds mutable state between runs.
    """

    def __init__(self) -> None:
        self._discovery = DiscoveryAgent()
        self._job_mapping = JobMappingAgent()
        self._waste_detection = WasteDetectionAgent()
        self._roi = ROIAgent()
        self._recommendation = RecommendationAgent()
        self._action = ActionAgent()

    async def run_audit(self, raw_rows: list[dict[str, Any]]) -> AuditReport:
        """Execute the full agent pipeline and return an AuditReport.

        Parameters
        ----------
        raw_rows:
            Parsed CSV rows as a list of dicts (output of ``csv_parser.parse_csv``).

        Returns
        -------
        AuditReport
            The complete audit result including tools, findings, ROI scores,
            recommendations, and the agent trace timeline.

        Raises
        ------
        OrchestrationError
            If the pipeline fails at any stage.
        """
        trace: list[AgentTraceStep] = []

        try:
            # ── Step 1: Discovery ────────────────────────────────────────
            discovery_result, step = await self._discovery.execute(
                DiscoveryInput(raw_rows=raw_rows)
            )
            trace.append(step)

            if not discovery_result.tools:
                logger.warning("Discovery Agent found no AI tools — returning empty report")
                return AuditReport(agent_trace=trace)

            # ── Step 2: Job Mapping ──────────────────────────────────────
            kb = get_knowledge_base()
            mapping_result, step = await self._job_mapping.execute(
                JobMappingInput(tools=discovery_result.tools, knowledge_base=kb)
            )
            trace.append(step)

            # ── Steps 3 & 4: Waste Detection + ROI (concurrent) ──────────
            # Both independently consume mapped_tools — run in parallel.
            logger.info("Running Waste Detection and ROI Intelligence concurrently")
            (waste_result, waste_step), (roi_result, roi_step) = await asyncio.gather(
                self._waste_detection.execute(
                    WasteDetectionInput(tools=mapping_result.mapped_tools)
                ),
                self._roi.execute(
                    ROIAnalysisInput(tools=mapping_result.mapped_tools)
                ),
            )
            trace.append(waste_step)
            trace.append(roi_step)

            # ── Step 5: Recommendation ───────────────────────────────────
            recommendation_result, step = await self._recommendation.execute(
                RecommendationInput(
                    tools=mapping_result.mapped_tools,
                    findings=waste_result.findings,
                    roi_scores=roi_result.scores,
                    knowledge_base=kb,
                )
            )
            trace.append(step)

            # ── Step 6: Action Agent ─────────────────────────────────────
            action_result, step = await self._action.execute(
                ActionInput(
                    tools=mapping_result.mapped_tools,
                    findings=waste_result.findings,
                    roi_scores=roi_result.scores,
                    recommendations=recommendation_result.recommendations,
                )
            )
            trace.append(step)

            # Attach full trace to the report
            action_result.report.agent_trace = trace
            return action_result.report

        except OrchestrationError:
            raise
        except Exception as exc:
            logger.exception("Pipeline failed")
            raise OrchestrationError(
                message=f"Audit pipeline failed: {exc}",
                details={"completed_steps": len(trace)},
            ) from exc
