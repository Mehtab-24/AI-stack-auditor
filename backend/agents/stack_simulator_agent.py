from typing import List, Dict, Any

def run_stack_simulation(tools: List[Dict[str, Any]], recommendations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Stack Simulator Agent: Models future-state tool coverage to ensure all job categories remain serviced.
    """
    # List of categories we want to ensure remain covered
    required_categories = set(t.get("category") for t in tools if t.get("category"))
    
    # Identify tools to be cancelled or consolidated
    cancelled_tool_names = set()
    for r in recommendations:
        if r["action"] in ["Cancel", "Consolidate"]:
            # Extract tool name
            cancelled_tool_names.add(r["toolName"])
            
    # Calculate covered categories in simulated future state
    future_covered = set()
    for t in tools:
        if t["name"] not in cancelled_tool_names:
            future_covered.add(t.get("category"))
            
    # Check if any categories became uncovered
    uncovered = required_categories - future_covered
    
    # In our mock/demo setup, we ensure alternative tools cover the gap, so uncovered should be empty.
    # If something did become uncovered, we flag a warning.
    is_safe = len(uncovered) == 0
    
    return {
        "is_safe": is_safe,
        "uncovered_categories": list(uncovered),
        "coverage_ratio": 1.0 if is_safe else (len(future_covered) / max(len(required_categories), 1)),
        "summary": "Simulated future state - 100% job coverage maintained with leaner footprint" if is_safe else f"Warning: {len(uncovered)} categories will be left uncovered: {', '.join(uncovered)}"
    }
