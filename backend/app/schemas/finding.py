"""Finding schema — individual waste/risk observations."""

from __future__ import annotations

from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.schemas.enums import AgentName, FindingType


class Finding(BaseModel):
    """A single finding produced by Waste Detection (or other diagnostic agents)."""

    id: UUID = Field(default_factory=uuid4)
    tool_id: UUID | None = None
    tool_name: str = ""
    finding_type: FindingType
    description: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    generated_by_agent: AgentName
