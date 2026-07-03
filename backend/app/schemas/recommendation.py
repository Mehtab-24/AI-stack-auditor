"""Recommendation schema — proposed actions for each finding."""

from __future__ import annotations

from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.schemas.enums import ActionType, RecommendationStatus


class Recommendation(BaseModel):
    """A draft recommendation linked to a finding."""

    id: UUID = Field(default_factory=uuid4)
    finding_id: UUID
    tool_name: str = ""
    action_type: ActionType
    suggested_alternative: str | None = None
    rationale: str = ""
    estimated_monthly_savings: float = 0.0
    estimated_annual_savings: float = 0.0
    status: RecommendationStatus = RecommendationStatus.DRAFT
