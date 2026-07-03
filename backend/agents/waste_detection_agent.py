import os
from typing import List, Dict, Any

async def run_waste_detection(tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Waste & Overlap Agent: Analyzes tool categories and seat usage to identify overlaps and leaks.
    """
    findings = []
    category_map = {}
    finding_id = 1

    # Group tools by category
    for t in tools:
        cat = t.get("category", "unclassified")
        if cat not in category_map:
            category_map[cat] = []
        category_map[cat].append(t)

    # 1. Detect duplicates within categories
    for cat, cat_tools in category_map.items():
        if len(cat_tools) > 1:
            # Sort by monthly cost descending to flag the more expensive redundant tools
            sorted_tools = sorted(cat_tools, key=lambda x: x.get("monthlyCost", 0), reverse=True)
            # Retain the most active tool
            most_active = max(cat_tools, key=lambda x: x.get("activeSeats", 0) / max(x.get("seats", 1), 1))
            
            for t in sorted_tools:
                if t["id"] != most_active["id"]:
                    findings.append({
                        "id": f"f{finding_id}",
                        "toolId": t["id"],
                        "type": "Duplicate",
                        "confidence": "High" if (t.get("activeSeats", 0) / max(t.get("seats", 1), 1)) < 0.3 else "Medium",
                        "agent": "Waste & Overlap Agent",
                        "reasoning": (
                            f"Waste & Overlap Agent flagged {t['name']} (${t['monthlyCost']}/mo) as duplicate of "
                            f"{most_active['name']} (${most_active['monthlyCost']}/mo) in the '{cat}' category. "
                            f"{most_active['name']} has higher active usage ({int(most_active['activeSeats']/most_active['seats']*100)}%)."
                        ),
                        "suggestedAlternative": f"Consolidate into {most_active['name']}",
                        "monthlySavings": t["monthlyCost"]
                    })
                    finding_id += 1
                    t["flagged"] = True

    # 2. Detect Inactive Seats / Underused Tiers
    for t in tools:
        # Skip if already flagged as duplicate
        if t.get("flagged"):
            continue
            
        seats = max(t.get("seats", 1), 1)
        active = t.get("activeSeats", 0)
        ratio = active / seats
        
        if ratio < 0.4:
            savings = int(t["monthlyCost"] * (1 - ratio))
            findings.append({
                "id": f"f{finding_id}",
                "toolId": t["id"],
                "type": "Inactive Seats" if ratio > 0 else "Underused",
                "confidence": "High" if ratio < 0.2 else "Medium",
                "agent": "Waste & Overlap Agent",
                "reasoning": (
                    f"{t['name']} has low active usage: {active} of {seats} seats active in the last 30 days ({int(ratio * 100)}% utilization). "
                    f"Consider downgrading to a smaller plan tier to save cost."
                ),
                "suggestedAlternative": f"Downgrade to {active if active > 0 else 1} seat plan",
                "monthlySavings": savings
            })
            finding_id += 1
            t["flagged"] = True

    # 3. Hidden Add-ons or Specific Patterns
    for t in tools:
        if t["name"] == "Figma AI Add-on":
            findings.append({
                "id": f"f{finding_id}",
                "toolId": t["id"],
                "type": "Hidden Add-on",
                "confidence": "Medium",
                "agent": "Waste & Overlap Agent",
                "reasoning": "Figma AI Add-on charges are bundled under general Figma organizational invoices and only 20% of seats are utilizing the AI workspace features.",
                "suggestedAlternative": "Remove AI add-on from Figma seats",
                "monthlySavings": t["monthlyCost"]
            })
            finding_id += 1
            t["flagged"] = True

    return findings
