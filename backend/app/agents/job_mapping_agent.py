"""Job-Mapping Agent — classifies each tool into a business-job category.

Responsibility:
    Assign a ToolCategory to every discovered tool, grounded against the
    knowledge base.  Falls back to keyword heuristics for unknown tools.

Current implementation:
    Deterministic lookup + keyword classification.
"""

from __future__ import annotations

from app.agents.base import BaseAgent
from app.schemas.agent_io import JobMappingInput, JobMappingOutput
from app.schemas.enums import AgentName, ToolCategory
from app.schemas.tool import DiscoveredTool, MappedTool
from app.utils.knowledge_base import KnowledgeBaseEntry, lookup_tool

# Keyword → category mapping for tools not in the knowledge base
_CATEGORY_KEYWORDS: dict[ToolCategory, set[str]] = {
    ToolCategory.CODING: {"code", "copilot", "developer", "ide", "programming", "dev", "cursor", "tabnine", "codeium"},
    ToolCategory.WRITING: {"write", "copy", "content", "grammar", "draft", "jasper", "notion ai", "text"},
    ToolCategory.MEETINGS: {"meeting", "transcript", "otter", "fireflies", "fathom", "record", "call", "zoom ai"},
    ToolCategory.DESIGN: {"design", "image", "figma", "midjourney", "dall-e", "creative", "visual", "art"},
    ToolCategory.SUPPORT: {"support", "chat", "helpdesk", "ticket", "intercom", "zendesk", "ada", "customer"},
    ToolCategory.ANALYTICS: {"analytics", "data", "insight", "dashboard", "bi", "hex", "mode", "tableau"},
    ToolCategory.SEARCH: {"search", "perplexity", "glean", "discovery", "find", "lookup", "you.com"},
}


class JobMappingAgent(BaseAgent[JobMappingInput, JobMappingOutput]):
    """Classifies discovered tools by business function."""

    @property
    def name(self) -> AgentName:
        return AgentName.JOB_MAPPING

    async def _run(self, input_data: JobMappingInput) -> JobMappingOutput:
        mapped: list[MappedTool] = []

        for tool in input_data.tools:
            category, confidence = self._classify(tool)
            mapped.append(
                MappedTool(
                    id=tool.id,
                    tool_name=tool.tool_name,
                    vendor=tool.vendor,
                    category=category,
                    monthly_cost=tool.monthly_cost,
                    plan_tier=tool.plan_tier,
                    seats_purchased=tool.seats_purchased,
                    seats_active_estimated=tool.seats_active_estimated,
                    is_ai_addon=tool.is_ai_addon,
                    source=tool.source,
                    renewal_date=tool.renewal_date,
                    mapping_confidence=confidence,
                )
            )

        return JobMappingOutput(mapped_tools=mapped)

    def _summarise(self, result: JobMappingOutput) -> str:
        categories = {t.category.value for t in result.mapped_tools}
        overlap_count = self._count_category_overlaps(result.mapped_tools)
        return (
            f"Mapped {len(result.mapped_tools)} tools to {len(categories)} job categories"
            f" — {overlap_count} potential overlap{'s' if overlap_count != 1 else ''} detected"
        )

    # ── Classification ───────────────────────────────────────────────────────

    def _classify(self, tool: DiscoveredTool) -> tuple[ToolCategory, float]:
        """Return (category, confidence) for a tool.

        Strategy:
        1. Look up in knowledge base → high confidence.
        2. Keyword match on tool name → medium confidence.
        3. Fallback to UNKNOWN → low confidence.
        """
        # 1. Knowledge-base lookup
        kb_entry: KnowledgeBaseEntry | None = lookup_tool(tool.tool_name)
        if kb_entry and kb_entry.known_categories:
            return kb_entry.known_categories[0], 0.95

        # 2. Keyword heuristic
        lower_name = tool.tool_name.lower()
        for category, keywords in _CATEGORY_KEYWORDS.items():
            if any(kw in lower_name for kw in keywords):
                return category, 0.70

        # 3. Fallback
        return ToolCategory.UNKNOWN, 0.30

    @staticmethod
    def _count_category_overlaps(tools: list[MappedTool]) -> int:
        """Count categories that have more than one tool (potential overlap)."""
        from collections import Counter

        counts = Counter(t.category for t in tools if t.category != ToolCategory.UNKNOWN)
        return sum(1 for count in counts.values() if count > 1)
