"""In-memory AI-tool knowledge base.

Provides a curated seed of ~50 known AI tools with their categories, typical
price ranges, and known alternatives.  Used by the Job-Mapping and
Recommendation agents for retrieval-grounded reasoning.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.schemas.enums import ToolCategory


class KnowledgeBaseEntry(BaseModel):
    """A single entry in the tool knowledge base."""

    tool_name: str
    known_categories: list[ToolCategory]
    typical_price_range: str
    known_alternatives: list[str]


# ── Seed data ────────────────────────────────────────────────────────────────

_SEED_DATA: list[dict[str, Any]] = [
    # Coding
    {"tool_name": "GitHub Copilot", "known_categories": ["coding"], "typical_price_range": "$10-39/user/mo", "known_alternatives": ["Cursor", "Tabnine", "Codeium", "Amazon CodeWhisperer"]},
    {"tool_name": "Cursor", "known_categories": ["coding"], "typical_price_range": "$20/user/mo", "known_alternatives": ["GitHub Copilot", "Tabnine", "Codeium"]},
    {"tool_name": "Cursor Pro", "known_categories": ["coding"], "typical_price_range": "$20/user/mo", "known_alternatives": ["GitHub Copilot", "Tabnine", "Codeium"]},
    {"tool_name": "Tabnine", "known_categories": ["coding"], "typical_price_range": "$12-39/user/mo", "known_alternatives": ["GitHub Copilot", "Cursor", "Codeium"]},
    {"tool_name": "Tabnine Enterprise", "known_categories": ["coding"], "typical_price_range": "$15-39/user/mo", "known_alternatives": ["GitHub Copilot", "Cursor", "Codeium"]},
    {"tool_name": "Codeium", "known_categories": ["coding"], "typical_price_range": "$0-15/user/mo", "known_alternatives": ["GitHub Copilot", "Cursor", "Tabnine"]},
    {"tool_name": "Amazon CodeWhisperer", "known_categories": ["coding"], "typical_price_range": "$0-19/user/mo", "known_alternatives": ["GitHub Copilot", "Cursor", "Tabnine"]},
    {"tool_name": "Replit AI", "known_categories": ["coding"], "typical_price_range": "$7-20/user/mo", "known_alternatives": ["GitHub Copilot", "Cursor"]},
    # Writing
    {"tool_name": "Jasper AI", "known_categories": ["writing"], "typical_price_range": "$39-59/user/mo", "known_alternatives": ["Copy.ai", "Writer.com", "ChatGPT"]},
    {"tool_name": "Jasper", "known_categories": ["writing"], "typical_price_range": "$39-59/user/mo", "known_alternatives": ["Copy.ai", "Writer.com", "ChatGPT"]},
    {"tool_name": "Copy.ai", "known_categories": ["writing"], "typical_price_range": "$36-49/user/mo", "known_alternatives": ["Jasper AI", "Writer.com", "ChatGPT"]},
    {"tool_name": "Writer.com", "known_categories": ["writing"], "typical_price_range": "$18-40/user/mo", "known_alternatives": ["Jasper AI", "Copy.ai", "Grammarly"]},
    {"tool_name": "Grammarly Business", "known_categories": ["writing"], "typical_price_range": "$15-25/user/mo", "known_alternatives": ["Writer.com", "ProWritingAid"]},
    {"tool_name": "Notion AI", "known_categories": ["writing"], "typical_price_range": "$8-10/user/mo", "known_alternatives": ["Jasper AI", "Copy.ai"]},
    {"tool_name": "Notion AI Add-on", "known_categories": ["writing"], "typical_price_range": "$8-10/user/mo", "known_alternatives": ["Jasper AI", "Copy.ai"]},
    # Meetings
    {"tool_name": "Otter.ai", "known_categories": ["meetings"], "typical_price_range": "$10-20/user/mo", "known_alternatives": ["Fireflies.ai", "Fathom", "tl;dv"]},
    {"tool_name": "Otter.ai Business", "known_categories": ["meetings"], "typical_price_range": "$15-20/user/mo", "known_alternatives": ["Fireflies.ai", "Fathom", "tl;dv"]},
    {"tool_name": "Fireflies.ai", "known_categories": ["meetings"], "typical_price_range": "$10-19/user/mo", "known_alternatives": ["Otter.ai", "Fathom", "tl;dv"]},
    {"tool_name": "Fathom", "known_categories": ["meetings"], "typical_price_range": "$0-15/user/mo", "known_alternatives": ["Otter.ai", "Fireflies.ai", "tl;dv"]},
    {"tool_name": "Fathom Premium", "known_categories": ["meetings"], "typical_price_range": "$12-19/user/mo", "known_alternatives": ["Otter.ai", "Fireflies.ai"]},
    {"tool_name": "tl;dv", "known_categories": ["meetings"], "typical_price_range": "$0-20/user/mo", "known_alternatives": ["Otter.ai", "Fireflies.ai", "Fathom"]},
    # Design
    {"tool_name": "Midjourney", "known_categories": ["design"], "typical_price_range": "$10-60/user/mo", "known_alternatives": ["DALL-E", "Stable Diffusion", "Adobe Firefly"]},
    {"tool_name": "Midjourney Pro", "known_categories": ["design"], "typical_price_range": "$30-60/user/mo", "known_alternatives": ["DALL-E", "Stable Diffusion", "Adobe Firefly"]},
    {"tool_name": "DALL-E", "known_categories": ["design"], "typical_price_range": "Pay-per-use", "known_alternatives": ["Midjourney", "Stable Diffusion", "Adobe Firefly"]},
    {"tool_name": "Adobe Firefly", "known_categories": ["design"], "typical_price_range": "$4.99-22.99/mo", "known_alternatives": ["Midjourney", "DALL-E", "Canva AI"]},
    {"tool_name": "Figma AI", "known_categories": ["design"], "typical_price_range": "$3-5/user/mo", "known_alternatives": ["Adobe Firefly", "Canva AI"]},
    {"tool_name": "Figma AI Add-on", "known_categories": ["design"], "typical_price_range": "$3-5/user/mo", "known_alternatives": ["Adobe Firefly", "Canva AI"]},
    {"tool_name": "Canva AI", "known_categories": ["design"], "typical_price_range": "$13-30/user/mo", "known_alternatives": ["Adobe Firefly", "Midjourney"]},
    # Support
    {"tool_name": "Intercom Fin AI", "known_categories": ["support"], "typical_price_range": "$0.99/resolution", "known_alternatives": ["Ada Support AI", "Zendesk AI", "Drift"]},
    {"tool_name": "Intercom Fin", "known_categories": ["support"], "typical_price_range": "$0.99/resolution", "known_alternatives": ["Ada Support AI", "Zendesk AI"]},
    {"tool_name": "Ada Support AI", "known_categories": ["support"], "typical_price_range": "Custom pricing", "known_alternatives": ["Intercom Fin AI", "Zendesk AI"]},
    {"tool_name": "Zendesk AI", "known_categories": ["support"], "typical_price_range": "$50-115/agent/mo", "known_alternatives": ["Intercom Fin AI", "Ada Support AI"]},
    {"tool_name": "Drift", "known_categories": ["support"], "typical_price_range": "$2500+/mo", "known_alternatives": ["Intercom Fin AI", "Ada Support AI"]},
    # Analytics
    {"tool_name": "Hex Magic", "known_categories": ["analytics"], "typical_price_range": "$24-60/user/mo", "known_alternatives": ["Mode AI Assist", "ThoughtSpot"]},
    {"tool_name": "Mode AI Assist", "known_categories": ["analytics"], "typical_price_range": "$35-60/user/mo", "known_alternatives": ["Hex Magic", "ThoughtSpot"]},
    {"tool_name": "ThoughtSpot", "known_categories": ["analytics"], "typical_price_range": "Custom pricing", "known_alternatives": ["Hex Magic", "Mode AI Assist"]},
    {"tool_name": "Tableau AI", "known_categories": ["analytics"], "typical_price_range": "$35-75/user/mo", "known_alternatives": ["Hex Magic", "ThoughtSpot"]},
    # Search
    {"tool_name": "Perplexity", "known_categories": ["search"], "typical_price_range": "$20/user/mo", "known_alternatives": ["Glean", "You.com"]},
    {"tool_name": "Perplexity Enterprise", "known_categories": ["search"], "typical_price_range": "$20-40/user/mo", "known_alternatives": ["Glean", "You.com"]},
    {"tool_name": "Glean", "known_categories": ["search"], "typical_price_range": "$15-30/user/mo", "known_alternatives": ["Perplexity", "You.com"]},
    {"tool_name": "You.com", "known_categories": ["search"], "typical_price_range": "$15-20/user/mo", "known_alternatives": ["Perplexity", "Glean"]},
    # General AI assistants (multi-category)
    {"tool_name": "ChatGPT Plus", "known_categories": ["writing", "coding", "search"], "typical_price_range": "$20/user/mo", "known_alternatives": ["Claude Pro", "Gemini Advanced"]},
    {"tool_name": "ChatGPT Team", "known_categories": ["writing", "coding", "search"], "typical_price_range": "$25-30/user/mo", "known_alternatives": ["Claude Pro", "Gemini Advanced"]},
    {"tool_name": "Claude Pro", "known_categories": ["writing", "coding", "search"], "typical_price_range": "$20/user/mo", "known_alternatives": ["ChatGPT Plus", "Gemini Advanced"]},
    {"tool_name": "Gemini Advanced", "known_categories": ["writing", "coding", "search"], "typical_price_range": "$20/user/mo", "known_alternatives": ["ChatGPT Plus", "Claude Pro"]},
]


# ── Public API ───────────────────────────────────────────────────────────────

_entries: list[KnowledgeBaseEntry] | None = None


def get_knowledge_base() -> list[KnowledgeBaseEntry]:
    """Return the full knowledge base (lazily initialised)."""
    global _entries
    if _entries is None:
        _entries = [
            KnowledgeBaseEntry(
                tool_name=row["tool_name"],
                known_categories=[ToolCategory(c) for c in row["known_categories"]],
                typical_price_range=row["typical_price_range"],
                known_alternatives=row["known_alternatives"],
            )
            for row in _SEED_DATA
        ]
    return _entries


def lookup_tool(name: str) -> KnowledgeBaseEntry | None:
    """Case-insensitive fuzzy lookup by tool name.

    Returns the best match or ``None``.
    """
    normalised = name.strip().lower()
    for entry in get_knowledge_base():
        if entry.tool_name.lower() == normalised:
            return entry
    # Substring fallback
    for entry in get_knowledge_base():
        if normalised in entry.tool_name.lower() or entry.tool_name.lower() in normalised:
            return entry
    return None


def get_alternatives_for(tool_name: str) -> list[str]:
    """Return known alternatives for a tool, or an empty list."""
    entry = lookup_tool(tool_name)
    return entry.known_alternatives if entry else []
