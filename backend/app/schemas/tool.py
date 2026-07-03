"""Tool schemas — models for discovered and categorised tools."""

from __future__ import annotations

from datetime import date
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.schemas.enums import ToolCategory, ToolSource


class DiscoveredTool(BaseModel):
    """A tool extracted from raw input data by the Discovery Agent."""

    id: UUID = Field(default_factory=uuid4)
    tool_name: str
    vendor: str
    monthly_cost: float
    plan_tier: str = "standard"
    seats_purchased: int = 1
    seats_active_estimated: int | None = None
    is_ai_addon: bool = False
    source: ToolSource = ToolSource.CSV
    renewal_date: date | None = None


class MappedTool(BaseModel):
    """A tool that has been classified into a business-job category."""

    id: UUID = Field(default_factory=uuid4)
    tool_name: str
    vendor: str
    category: ToolCategory
    monthly_cost: float
    plan_tier: str = "standard"
    seats_purchased: int = 1
    seats_active_estimated: int | None = None
    is_ai_addon: bool = False
    source: ToolSource = ToolSource.CSV
    renewal_date: date | None = None
    mapping_confidence: float = Field(ge=0.0, le=1.0, default=1.0)
