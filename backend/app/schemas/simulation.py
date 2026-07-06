"""Simulation schemas — Stack Simulator request and response models.

SimTool is a lightweight representation of a tool for simulation purposes.
The frontend sends only tool_name, monthly_cost, and an optional category
string — the simulator enriches internally using the knowledge base.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class SimTool(BaseModel):
    """Lightweight tool descriptor used as Stack Simulator input.

    Much simpler than MappedTool — the frontend only needs to send
    tool_name + cost to run a simulation scenario.
    """

    tool_name: str = Field(..., min_length=1, description="Name of the tool.")
    monthly_cost: float = Field(..., ge=0, description="Current monthly cost in USD.")
    category: str = Field(
        default="unknown",
        description="Business-job category (e.g. coding, writing). Defaults to 'unknown'.",
    )


class SimulationRequest(BaseModel):
    """Input for the Stack Simulator."""

    tools: list[SimTool] = Field(
        ...,
        description="Current tool inventory — send tool_name and monthly_cost for each tool.",
    )
    hypothetical: str = Field(
        ...,
        min_length=1,
        description="Natural-language description of the change to simulate (e.g. 'replace Copilot with Cursor').",
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
