from typing import List, Dict, Any

def run_recommendations(tools: List[Dict[str, Any]], findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Alternative Recommendation Agent: Proposes actionable next steps (retain/consolidate/cancel) for each finding.
    """
    recommendations = []
    
    action_map = {
        "Duplicate": "Consolidate",
        "Underused": "Downgrade",
        "Overpriced Tier": "Cancel",
        "Inactive Seats": "Downgrade",
        "Hidden Add-on": "Cancel",
        "Renewal Risk": "Review Renewal"
    }

    for f in findings:
        tool = next((t for t in tools if t["id"] == f["toolId"]), None)
        if not tool:
            continue
            
        action = action_map.get(f["type"], "Review Renewal")
        monthly_savings = f.get("monthlySavings", 0)
        annual_savings = monthly_savings * 12
        
        # Formulate rationale
        if action == "Consolidate":
            rationale = f.get("suggestedAlternative", f"Consolidate {tool['name']} services to save costs.")
        elif action == "Downgrade":
            rationale = f.get("suggestedAlternative", f"Reduce active seats from {tool['seats']} down to {tool['activeSeats']}.")
        else:
            rationale = f"Cancel {tool['name']} plan and transition workflows to existing company alternatives."
            
        recommendations.append({
            "id": f"r-{f['id']}",
            "findingId": f["id"],
            "toolName": tool["name"],
            "action": action,
            "monthlySavings": monthly_savings,
            "annualSavings": annual_savings,
            "rationale": rationale
        })
        
    return recommendations
