from typing import List, Dict, Any

def run_action_agent(tools: List[Dict[str, Any]], findings: List[Dict[str, Any]], recommendations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Action Agent: Compiles the final executive summary report containing totals and metrics.
    """
    total_monthly = sum(r.get("monthlySavings", 0) for r in recommendations)
    total_annual = total_monthly * 12
    
    flagged_tool_ids = set(f.get("toolId") for f in findings if f.get("toolId"))
    
    return {
        "totalMonthlySavings": total_monthly,
        "totalAnnualSavings": total_annual,
        "totalToolsDiscovered": len(tools),
        "totalToolsFlagged": len(flagged_tool_ids),
        "savingsRatio": total_monthly / max(sum(t.get("monthlyCost", 0) for t in tools), 1)
    }
