"""Report schema — the final audit output and per-agent trace."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.schemas.enums import AgentName
from app.schemas.finding import Finding
from app.schemas.recommendation import Recommendation
from app.schemas.roi import ROIScore
from app.schemas.tool import MappedTool


class AgentTraceStep(BaseModel):
    """One step in the agent-trace timeline."""

    agent: AgentName
    status: str = "completed"
    summary: str = ""
    duration_ms: float = 0.0


class AuditReport(BaseModel):
    """Complete audit result — the final output of the Action Agent."""

    id: UUID = Field(default_factory=uuid4)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tools: list[MappedTool] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    roi_scores: list[ROIScore] = Field(default_factory=list)
    recommendations: list[Recommendation] = Field(default_factory=list)
    agent_trace: list[AgentTraceStep] = Field(default_factory=list)
    total_monthly_savings: float = 0.0
    total_annual_savings: float = 0.0
    tools_discovered: int = 0
    tools_flagged: int = 0
