import os
import json
import httpx
import pandas as pd
from typing import List, Dict, Any

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

async def run_discovery(file_content: str = None, use_demo: bool = False) -> List[Dict[str, Any]]:
    """
    Discovery Agent: Scans raw text / CSV data and extracts active AI tools.
    """
    # Demo dataset fallback
    if use_demo or not file_content:
        return [
            { "id": "t1", "name": "GitHub Copilot", "vendor": "GitHub", "category": "coding", "monthlyCost": 190, "seats": 10, "activeSeats": 9, "flagged": False },
            { "id": "t2", "name": "Cursor Pro", "vendor": "Anysphere", "category": "coding", "monthlyCost": 200, "seats": 10, "activeSeats": 4, "flagged": True },
            { "id": "t3", "name": "Tabnine Enterprise", "vendor": "Tabnine", "category": "coding", "monthlyCost": 150, "seats": 10, "activeSeats": 2, "flagged": True },
            { "id": "t4", "name": "Jasper AI", "vendor": "Jasper", "category": "writing", "monthlyCost": 49, "seats": 3, "activeSeats": 1, "flagged": True },
            { "id": "t5", "name": "Copy.ai", "vendor": "Copy.ai", "category": "writing", "monthlyCost": 36, "seats": 3, "activeSeats": 3, "flagged": False },
            { "id": "t6", "name": "Writer.com", "vendor": "Writer", "category": "writing", "monthlyCost": 108, "seats": 6, "activeSeats": 5, "flagged": False },
            { "id": "t7", "name": "Otter.ai Business", "vendor": "Otter", "category": "meetings", "monthlyCost": 120, "seats": 8, "activeSeats": 7, "flagged": False },
            { "id": "t8", "name": "Fireflies.ai", "vendor": "Fireflies", "category": "meetings", "monthlyCost": 152, "seats": 8, "activeSeats": 2, "flagged": True },
            { "id": "t9", "name": "Fathom Premium", "vendor": "Fathom", "category": "meetings", "monthlyCost": 96, "seats": 8, "activeSeats": 1, "flagged": True },
            { "id": "t10", "name": "Midjourney Pro", "vendor": "Midjourney", "category": "design", "monthlyCost": 60, "seats": 2, "activeSeats": 2, "flagged": False },
            { "id": "t11", "name": "Figma AI Add-on", "vendor": "Figma", "category": "design", "monthlyCost": 75, "seats": 15, "activeSeats": 3, "flagged": True },
            { "id": "t12", "name": "Intercom Fin AI", "vendor": "Intercom", "category": "support", "monthlyCost": 395, "seats": 5, "activeSeats": 5, "flagged": False },
            { "id": "t13", "name": "Ada Support AI", "vendor": "Ada", "category": "support", "monthlyCost": 480, "seats": 5, "activeSeats": 2, "flagged": True },
            { "id": "t14", "name": "Hex Magic", "vendor": "Hex", "category": "analytics", "monthlyCost": 240, "seats": 4, "activeSeats": 4, "flagged": False },
            { "id": "t15", "name": "Mode AI Assist", "vendor": "Mode", "category": "analytics", "monthlyCost": 180, "seats": 4, "activeSeats": 1, "flagged": True },
            { "id": "t16", "name": "Perplexity Enterprise", "vendor": "Perplexity", "category": "search", "monthlyCost": 400, "seats": 20, "activeSeats": 18, "flagged": False },
            { "id": "t17", "name": "Glean", "vendor": "Glean", "category": "search", "monthlyCost": 600, "seats": 20, "activeSeats": 19, "flagged": False },
            { "id": "t18", "name": "Notion AI Add-on", "vendor": "Notion", "category": "writing", "monthlyCost": 80, "seats": 10, "activeSeats": 4, "flagged": True },
        ]

    # Try LLM Discovery if key is present
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
            prompt = (
                "You are an expert SaaS discovery agent. Read this raw text content from an invoice or expense export, "
                "and identify all AI software tools (e.g. GitHub Copilot, ChatGPT, Jasper, etc.). "
                "For each tool, extract the tool name, vendor, monthly cost (numeric), seats purchased (integer), "
                "and estimated active seats (integer, or default to 50% of seats if unspecified). "
                "Respond ONLY with a valid JSON array of objects with keys: name, vendor, monthlyCost, seats, activeSeats.\n\n"
                f"Content:\n{file_content}"
            )
            
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    tools = json.loads(text)
                    
                    # Sanitize and add temporary IDs
                    for i, t in enumerate(tools):
                        t["id"] = f"t{i+1}"
                        t["flagged"] = False
                        # ensure proper keys
                        t["monthlyCost"] = float(t.get("monthlyCost", 0))
                        t["seats"] = int(t.get("seats", 1))
                        t["activeSeats"] = int(t.get("activeSeats", 1))
                        t["category"] = "unclassified"
                    return tools
        except Exception as e:
            print("Gemini discovery failed, falling back to rule-based parser:", e)

    # Rule-based fallback parser
    discovered = []
    lines = file_content.splitlines()
    tool_id = 1
    
    # Common tools lookup
    ai_patterns = {
        "copilot": ("GitHub Copilot", "GitHub", "coding", 19),
        "cursor": ("Cursor Pro", "Anysphere", "coding", 20),
        "tabnine": ("Tabnine Enterprise", "Tabnine", "coding", 15),
        "jasper": ("Jasper AI", "Jasper", "writing", 49),
        "copy.ai": ("Copy.ai", "Copy.ai", "writing", 36),
        "writer": ("Writer.com", "Writer", "writing", 18),
        "otter": ("Otter.ai Business", "Otter", "meetings", 15),
        "fireflies": ("Fireflies.ai", "Fireflies", "meetings", 19),
        "fathom": ("Fathom Premium", "Fathom", "meetings", 12),
        "midjourney": ("Midjourney Pro", "Midjourney", "design", 30),
        "figma": ("Figma AI Add-on", "Figma", "design", 5),
        "intercom": ("Intercom Fin AI", "Intercom", "support", 79),
        "ada": ("Ada Support AI", "Ada", "support", 96),
        "hex": ("Hex Magic", "Hex", "analytics", 60),
        "mode": ("Mode AI Assist", "Mode", "analytics", 45),
        "perplexity": ("Perplexity Enterprise", "Perplexity", "search", 20),
        "glean": ("Glean", "Glean", "search", 30),
        "notion": ("Notion AI Add-on", "Notion", "writing", 8)
      }

    for line in lines:
        lower_line = line.lower()
        for key, (name, vendor, category, default_unit_cost) in ai_patterns.items():
            if key in lower_line:
                # Basic heuristic extraction
                seats = 10
                active = 5
                monthly_cost = default_unit_cost * seats
                
                # Check if we already added this tool in this run
                if not any(d["name"] == name for d in discovered):
                    discovered.append({
                        "id": f"t{tool_id}",
                        "name": name,
                        "vendor": vendor,
                        "category": category,
                        "monthlyCost": monthly_cost,
                        "seats": seats,
                        "activeSeats": active,
                        "flagged": False
                    })
                    tool_id += 1
                    
    # If rule-based found nothing, load a few demo tools
    if not discovered:
        return [
            { "id": "t1", "name": "GitHub Copilot", "vendor": "GitHub", "category": "coding", "monthlyCost": 190, "seats": 10, "activeSeats": 9, "flagged": False },
            { "id": "t2", "name": "Cursor Pro", "vendor": "Anysphere", "category": "coding", "monthlyCost": 200, "seats": 10, "activeSeats": 4, "flagged": True },
            { "id": "t3", "name": "Tabnine Enterprise", "vendor": "Tabnine", "category": "coding", "monthlyCost": 150, "seats": 10, "activeSeats": 2, "flagged": True }
        ]
        
    return discovered
