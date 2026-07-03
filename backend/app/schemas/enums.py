"""Enumeration types shared across schemas and agents.

Each enum uses ``str`` as a mixin so values serialise as plain strings in JSON
responses without any special encoder configuration.
"""

from __future__ import annotations

from enum import Enum


class ToolCategory(str, Enum):
    """Business-job taxonomy for AI tools."""

    CODING = "coding"
    WRITING = "writing"
    MEETINGS = "meetings"
    DESIGN = "design"
    SUPPORT = "support"
    ANALYTICS = "analytics"
    SEARCH = "search"
    UNKNOWN = "unknown"


class FindingType(str, Enum):
    """Classification of waste/risk findings."""

    DUPLICATE = "duplicate"
    UNDERUSED = "underused"
    OVERPRICED_TIER = "overpriced_tier"
    INACTIVE_SEATS = "inactive_seats"
    HIDDEN_ADDON = "hidden_addon"
    RENEWAL_RISK = "renewal_risk"


class ActionType(str, Enum):
    """Possible recommendation actions."""

    RETAIN = "retain"
    DOWNGRADE = "downgrade"
    CANCEL = "cancel"
    CONSOLIDATE = "consolidate"
    REVIEW_RENEWAL = "review_renewal"


class RecommendationStatus(str, Enum):
    """Lifecycle status of a recommendation."""

    DRAFT = "draft"
    APPROVED = "approved"
    DISMISSED = "dismissed"


class ToolSource(str, Enum):
    """How the tool was ingested."""

    CSV = "csv"
    INVOICE = "invoice"
    MANUAL = "manual"


class AgentName(str, Enum):
    """Canonical names for every agent in the pipeline."""

    DISCOVERY = "Discovery Agent"
    JOB_MAPPING = "Job-Mapping Agent"
    WASTE_DETECTION = "Waste Detection Agent"
    PROMPT = "Prompt Agent"
    ROI = "ROI Agent"
    AI_ROUTER = "AI Router Agent"
    RECOMMENDATION = "Recommendation Agent"
    ACTION = "Action Agent"
