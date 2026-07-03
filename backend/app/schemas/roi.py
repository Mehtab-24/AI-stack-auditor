"""ROI score schema — business-value assessment per tool."""

from __future__ import annotations

from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ROIScore(BaseModel):
    """ROI assessment for a single tool, produced by the ROI Agent."""

    id: UUID = Field(default_factory=uuid4)
    tool_id: UUID
    tool_name: str = ""
    roi_score: float = Field(ge=0.0, le=10.0)
    productivity_score: float = Field(ge=0.0, le=10.0)
    business_value_estimate: str = ""
    confidence_score: float = Field(ge=0.0, le=1.0)
