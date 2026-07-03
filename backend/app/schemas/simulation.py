"""Simulation schemas — Stack Simulator request and response models."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.tool import MappedTool


class SimulationRequest(BaseModel):
    """Input for the Stack Simulator."""

    tools: list[MappedTool]
    hypothetical: str = Field(
        ...,
        min_length=1,
        description="Natural-language description of the change to simulate.",
    )


class SimulationResult(BaseModel):
    """Ephemeral output of the Stack Simulator — not persisted."""

    predicted_monthly_cost: float = 0.0
    predicted_annual_cost: float = 0.0
    productivity_impact: str = ""
    risk_score: float = Field(ge=0.0, le=10.0, default=0.0)
    recommendation: str = ""
    original_monthly_cost: float = 0.0
    savings_delta: float = 0.0
