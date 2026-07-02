import os
import httpx
import json
from typing import List, Dict, Any

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")

async def run_roi_reasoning(tools: List[Dict[str, Any]], findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    ROI Reasoning Agent: Analyzes the cost-to-value ratio of each subscription.
    """
    enhanced_findings = []
    
    for f in findings:
        f_copy = dict(f)
        tool_id = f_copy.get("toolId")
        tool = next((t for t in tools if t["id"] == tool_id), None)
        
        if not tool:
            enhanced_findings.append(f_copy)
            continue
            
        # Try calling Claude for reasoning
        if CLAUDE_API_KEY:
            try:
                url = "https://api.anthropic.com/v1/messages"
                headers = {
                    "x-api-key": CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                prompt = (
                    f"You are a Senior SaaS ROI Auditor. Write a 2-sentence executive reasoning paragraph explaining "
                    f"why the tool '{tool['name']}' ({tool['vendor']}) costing ${tool['monthlyCost']}/mo with {tool['activeSeats']} active seats "
                    f"out of {tool['seats']} has a negative return on investment (ROI). "
                    f"Finding category: {f_copy['type']}. Reasoning details: {f_copy['reasoning']}. "
                    "Write only the reasoning text. Do not include any intros or headers."
                )
                payload = {
                    "model": "claude-3-5-sonnet-20241022",
                    "max_tokens": 150,
                    "messages": [{"role": "user", "content": prompt}]
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        reasoning = data["content"][0]["text"].strip()
                        f_copy["reasoning"] = reasoning
                        enhanced_findings.append(f_copy)
                        continue
            except Exception as e:
                print("Claude ROI query failed, falling back to rule reasoning:", e)

        # Fallback rule-based ROI justification paragraphs
        name = tool.get("name", "")
        seats = tool.get("seats", 1)
        active = tool.get("activeSeats", 0)
        cost = tool.get("monthlyCost", 0)
        
        if f_copy["type"] == "Duplicate":
            f_copy["reasoning"] = (
                f"ROI Analysis: Maintaining both {name} and its category equivalents creates functional overlap. "
                f"With only {active}/{seats} seats active, the organization is paying multiple subscription premiums "
                f"for identical features, rendering the incremental value of {name} near zero."
            )
        elif f_copy["type"] == "Inactive Seats":
            f_copy["reasoning"] = (
                f"ROI Analysis: Paying ${cost}/mo for {seats} seats while only {active} are active is a direct capital leak. "
                f"The unassigned seats represent idle capacity with zero business output, making an immediate plan "
                f"downgrade or seat clawback highly ROI-positive."
            )
        else:
            f_copy["reasoning"] = (
                f"ROI Analysis: The usage density for {name} ({int(active/seats*100)}%) is insufficient to justify the "
                f"premium tier subscription of ${cost}/mo. Consolidating work to default company tools will "
                f"save substantial costs without impact on team output."
            )
            
        enhanced_findings.append(f_copy)

    return enhanced_findings
