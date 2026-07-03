import os
import json
import httpx
from typing import List, Dict, Any

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

TAXONOMY = ["coding", "writing", "meetings", "design", "support", "analytics", "search"]

async def run_job_mapping(tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Job-Mapping Agent: Maps discovered tools to job taxonomy categories.
    """
    mapped_tools = []
    
    # Pre-defined mapping catalog
    catalog = {
        "GitHub Copilot": "coding",
        "Cursor Pro": "coding",
        "Tabnine Enterprise": "coding",
        "Jasper AI": "writing",
        "Copy.ai": "writing",
        "Writer.com": "writing",
        "Otter.ai Business": "meetings",
        "Fireflies.ai": "meetings",
        "Fathom Premium": "meetings",
        "Midjourney Pro": "design",
        "Figma AI Add-on": "design",
        "Intercom Fin AI": "support",
        "Ada Support AI": "support",
        "Hex Magic": "analytics",
        "Mode AI Assist": "analytics",
        "Perplexity Enterprise": "search",
        "Glean": "search",
        "Notion AI Add-on": "writing"
    }

    for t in tools:
        tool_copy = dict(t)
        name = tool_copy.get("name", "")
        
        # Check standard catalog mapping
        if name in catalog:
            tool_copy["category"] = catalog[name]
        elif tool_copy.get("category") == "unclassified" or not tool_copy.get("category"):
            # If not in catalog, fallback to checking substring keywords
            lower_name = name.lower()
            if any(k in lower_name for k in ["copilot", "code", "cursor", "tabnine", "gpt-engineer"]):
                tool_copy["category"] = "coding"
            elif any(k in lower_name for k in ["jasper", "copy", "write", "writer", "notion"]):
                tool_copy["category"] = "writing"
            elif any(k in lower_name for k in ["otter", "fireflies", "fathom", "zoom", "meet"]):
                tool_copy["category"] = "meetings"
            elif any(k in lower_name for k in ["midjourney", "figma", "canva", "dall", "stable"]):
                tool_copy["category"] = "design"
            elif any(k in lower_name for k in ["intercom", "ada", "zendesk", "support"]):
                tool_copy["category"] = "support"
            elif any(k in lower_name for k in ["hex", "mode", "tableau", "analytics", "amplitude"]):
                tool_copy["category"] = "analytics"
            elif any(k in lower_name for k in ["perplexity", "glean", "search", "google"]):
                tool_copy["category"] = "search"
            else:
                # LLM Classification if key is set
                if GEMINI_API_KEY:
                    try:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
                        prompt = (
                            f"Classify the SaaS tool '{name}' into one of these business job categories: "
                            f"{', '.join(TAXONOMY)}. Respond ONLY with the category string in lowercase."
                        )
                        headers = {"Content-Type": "application/json"}
                        payload = {"contents": [{"parts": [{"text": prompt}]}]}
                        async with httpx.AsyncClient(timeout=10.0) as client:
                            resp = await client.post(url, json=payload, headers=headers)
                            if resp.status_code == 200:
                                data = resp.json()
                                cat = data["candidates"][0]["content"]["parts"][0]["text"].strip().lower()
                                if cat in TAXONOMY:
                                    tool_copy["category"] = cat
                                    mapped_tools.append(tool_copy)
                                    continue
                    except Exception:
                        pass
                
                tool_copy["category"] = "writing" # default fallback
        
        mapped_tools.append(tool_copy)
        
    return mapped_tools
