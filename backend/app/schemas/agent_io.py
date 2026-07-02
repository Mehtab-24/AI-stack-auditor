"""Agent I/O contracts — typed input and output models for every agent.

Centralised here so the orchestrator can import all contracts from one place
without depending on agent implementations.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.finding import Finding
from app.schemas.recommendation import Recommendation
from app.schemas.report import AuditReport
from app.schemas.roi import ROIScore
from app.schemas.tool import DiscoveredTool, MappedTool
from app.utils.knowledge_base import KnowledgeBaseEntry


# ── Discovery Agent ──────────────────────────────────────────────────────────


class DiscoveryInput(BaseModel):
    """Raw rows parsed from CSV/invoice."""

    raw_rows: list[dict[str, Any]]


class DiscoveryOutput(BaseModel):
    """Tools extracted by the Discovery Agent."""

    tools: list[DiscoveredTool] = Field(default_factory=list)


# ── Job-Mapping Agent ────────────────────────────────────────────────────────


class JobMappingInput(BaseModel):
    """Discovered tools + knowledge base for grounded classification."""

    tools: list[DiscoveredTool]
    knowledge_base: list[KnowledgeBaseEntry] = Field(default_factory=list)


class JobMappingOutput(BaseModel):
    """Tools with assigned categories."""

    mapped_tools: list[MappedTool] = Field(default_factory=list)


# ── Waste Detection Agent ────────────────────────────────────────────────────


class WasteDetectionInput(BaseModel):
    """Categorised tools for waste analysis."""

    tools: list[MappedTool]


class WasteDetectionOutput(BaseModel):
    """Findings produced by the Waste Detection Agent."""

    findings: list[Finding] = Field(default_factory=list)


# ── Prompt Agent ─────────────────────────────────────────────────────────────


class PromptOptimization(BaseModel):
    """A single prompt-optimization suggestion (placeholder)."""

    tool_name: str = ""
    suggestion: str = ""


class PromptAnalysisInput(BaseModel):
    """Tools and findings for prompt analysis."""

    tools: list[MappedTool]
    findings: list[Finding]


class PromptAnalysisOutput(BaseModel):
    """Prompt optimisation results (currently a pass-through)."""

    optimizations: list[PromptOptimization] = Field(default_factory=list)


# ── ROI Agent ────────────────────────────────────────────────────────────────


class ROIAnalysisInput(BaseModel):
    """Categorised tools for ROI scoring."""

    tools: list[MappedTool]


class ROIAnalysisOutput(BaseModel):
    """ROI scores produced by the ROI Agent."""

    scores: list[ROIScore] = Field(default_factory=list)


# ── AI Router Agent ──────────────────────────────────────────────────────────


class RoutingSuggestion(BaseModel):
    """A single routing suggestion (placeholder)."""

    tool_name: str = ""
    suggestion: str = ""


class AIRouterInput(BaseModel):
    """Tools and ROI scores for routing analysis."""

    tools: list[MappedTool]
    roi_scores: list[ROIScore]


class AIRouterOutput(BaseModel):
    """Routing suggestions (currently a pass-through)."""

    routing_suggestions: list[RoutingSuggestion] = Field(default_factory=list)


# ── Recommendation Agent ────────────────────────────────────────────────────


class RecommendationInput(BaseModel):
    """All upstream data needed to generate recommendations."""

    tools: list[MappedTool]
    findings: list[Finding]
    roi_scores: list[ROIScore]
    knowledge_base: list[KnowledgeBaseEntry] = Field(default_factory=list)


class RecommendationOutput(BaseModel):
    """Recommendations produced by the Recommendation Agent."""

    recommendations: list[Recommendation] = Field(default_factory=list)


# ── Action Agent ─────────────────────────────────────────────────────────────


class ActionInput(BaseModel):
    """Everything needed to compile the final report."""

    tools: list[MappedTool]
    findings: list[Finding]
    roi_scores: list[ROIScore]
    recommendations: list[Recommendation]


class ActionOutput(BaseModel):
    """The complete audit report."""

    report: AuditReport
