"""Job-Mapping Agent — classifies each tool into a business-job category.

Responsibility:
    Assign a ToolCategory to every discovered tool, grounded against the
    knowledge base.  Falls back to keyword heuristics, then to an LLM call
    for tools that are still unclassified after heuristic matching.

Classification strategy (in priority order):
    1. Knowledge-base exact/substring match → confidence 0.95
    2. Keyword heuristic on tool name       → confidence 0.70
    3. Gemini LLM classification            → confidence from LLM (typically 0.75–0.85)
    4. UNKNOWN fallback                     → confidence 0.30
"""

from __future__ import annotations

from app.agents.base import BaseAgent
from app.schemas.agent_io import JobMappingInput, JobMappingOutput
from app.schemas.enums import AgentName, ToolCategory
from app.schemas.tool import DiscoveredTool, MappedTool
from app.services.llm_client import get_llm_client
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

_VALID_CATEGORIES = {c.value for c in ToolCategory}

_LLM_SCHEMA_HINT = """{
  "category": "one of: coding, writing, meetings, design, support, analytics, search, unknown",
  "confidence": "number between 0.0 and 1.0"
}"""


class JobMappingAgent(BaseAgent[JobMappingInput, JobMappingOutput]):
    """Classifies discovered tools by business function."""

    @property
    def name(self) -> AgentName:
        return AgentName.JOB_MAPPING

    async def _run(self, input_data: JobMappingInput) -> JobMappingOutput:
        llm = get_llm_client()
        mapped: list[MappedTool] = []

        for tool in input_data.tools:
            category, confidence = self._classify_deterministic(tool)

            # LLM fallback: only invoked for tools that couldn't be classified
            if category == ToolCategory.UNKNOWN and llm.is_enabled:
                llm_category, llm_confidence = await self._classify_with_llm(llm, tool)
                category = llm_category
                confidence = llm_confidence

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
        llm_classified = sum(
            1 for t in result.mapped_tools
            if t.mapping_confidence > 0.70 and t.mapping_confidence < 0.95
        )
        summary = (
            f"Mapped {len(result.mapped_tools)} tools to {len(categories)} job categories"
            f" — {overlap_count} potential overlap{'s' if overlap_count != 1 else ''} detected"
        )
        if llm_classified:
            summary += f" ({llm_classified} classified via LLM)"
        return summary

    # ── Deterministic classification ─────────────────────────────────────────

    def _classify_deterministic(self, tool: DiscoveredTool) -> tuple[ToolCategory, float]:
        """KB lookup then keyword heuristic. Returns UNKNOWN/0.30 if both fail."""
        # 1. Knowledge-base lookup
        kb_entry: KnowledgeBaseEntry | None = lookup_tool(tool.tool_name)
        if kb_entry and kb_entry.known_categories:
            return kb_entry.known_categories[0], 0.95

        # 2. Keyword heuristic
        lower_name = tool.tool_name.lower()
        for category, keywords in _CATEGORY_KEYWORDS.items():
            if any(kw in lower_name for kw in keywords):
                return category, 0.70

        return ToolCategory.UNKNOWN, 0.30

    # ── LLM classification ───────────────────────────────────────────────────

    async def _classify_with_llm(
        self, llm: object, tool: DiscoveredTool
    ) -> tuple[ToolCategory, float]:
        """Ask Gemini to classify a tool that neither the KB nor keywords matched."""
        from app.services.llm_client import GeminiClient
        assert isinstance(llm, GeminiClient)

        prompt = (
            f"You are classifying an AI software tool into a business-job category.\n\n"
            f"Tool name: {tool.tool_name}\n"
            f"Vendor: {tool.vendor}\n"
            f"Monthly cost: ${tool.monthly_cost}\n"
            f"Plan tier: {tool.plan_tier}\n\n"
            f"Classify this tool into exactly one of these business-job categories:\n"
            f"coding, writing, meetings, design, support, analytics, search, unknown\n\n"
            f"Choose 'unknown' only if you genuinely cannot determine the category."
        )

        result = await llm.generate_json(prompt, schema_hint=_LLM_SCHEMA_HINT)

        if result is None:
            return ToolCategory.UNKNOWN, 0.30

        raw_category = str(result.get("category", "unknown")).lower().strip()
        confidence = float(result.get("confidence", 0.75))
        confidence = max(0.0, min(1.0, confidence))

        if raw_category not in _VALID_CATEGORIES:
            return ToolCategory.UNKNOWN, 0.30

        return ToolCategory(raw_category), confidence

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _count_category_overlaps(tools: list[MappedTool]) -> int:
        """Count categories that have more than one tool (potential overlap)."""
        from collections import Counter
        counts = Counter(t.category for t in tools if t.category != ToolCategory.UNKNOWN)
        return sum(1 for count in counts.values() if count > 1)
