import os
import datetime
from typing import Dict, Any, List, Optional
from supabase import create_client, Client

# Import agents
from agents.discovery_agent import run_discovery
from agents.job_mapping_agent import run_job_mapping
from agents.waste_detection_agent import run_waste_detection
from agents.roi_reasoning_agent import run_roi_reasoning
from agents.recommendation_agent import run_recommendations
from agents.stack_simulator_agent import run_stack_simulation
from agents.action_agent import run_action_agent

# Initialize Supabase client using Service Role key
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase_client: Optional[Client] = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print("Supabase service role client initialized successfully.")
    except Exception as e:
        print("Failed to initialize Supabase client:", e)

async def run_agent_pipeline(
    file_content: Optional[str] = None,
    use_demo: bool = False,
    business_name: str = "My Startup",
    business_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sequential multi-agent orchestration pipeline.
    Runs 7 agents, compiles the trace logs, and persists to Supabase if configured.
    """
    
    # 1. Discovery Agent
    tools = await run_discovery(file_content, use_demo)
    
    # 2. Job Mapping Agent
    tools = await run_job_mapping(tools)
    
    # 3. Waste Detection Agent
    findings = await run_waste_detection(tools)
    
    # 4. ROI Reasoning Agent
    findings = await run_roi_reasoning(tools, findings)
    
    # 5. Alternative Recommendation Agent
    recs = run_recommendations(tools, findings)
    
    # 6. Stack Simulator Agent
    sim_result = run_stack_simulation(tools, recs)
    
    # 7. Action Agent
    summary = run_action_agent(tools, findings, recs)
    
    # Compile Agent Trace steps for UI animation
    trace_steps = [
        {
            "agent": "Discovery Agent",
            "label": "Discovery",
            "running": "Scanning uploaded data for AI tools...",
            "result": f"Found {len(tools)} AI tools across {len(set(t['vendor'] for t in tools))} vendors."
        },
        {
            "agent": "Job-Mapping Agent",
            "label": "Job Mapping",
            "running": "Classifying tools by business function...",
            "result": f"Mapped tools to taxonomy categories — {len(set(t['category'] for t in tools))} categories active."
        },
        {
            "agent": "Waste & Overlap Agent",
            "label": "Waste & Overlap",
            "running": "Detecting overlap and underused subscriptions...",
            "result": f"Flagged {summary['totalToolsFlagged']} tools with efficiency indicators."
        },
        {
            "agent": "ROI Reasoning Agent",
            "label": "ROI Reasoning",
            "running": "Analyzing subscription ROI vs cost-value tiers...",
            "result": "Calculated value scores. Low-density seats identified."
        },
        {
            "agent": "Alternative Recommendation Agent",
            "label": "Alternatives",
            "running": "Finding cheaper equivalents...",
            "result": f"Identified {len(recs)} consolidation & downgrade opportunities."
        },
        {
            "agent": "Stack Simulator Agent",
            "label": "Stack Simulator",
            "running": "Simulating post-consolidation coverage...",
            "result": sim_result["summary"]
        },
        {
            "agent": "Action Agent",
            "label": "Report",
            "running": "Compiling final savings report...",
            "result": f"Draft report ready — ${summary['totalMonthlySavings']}/mo potential savings."
        }
    ]

    # Persist to Supabase if client is active and we have a target business_id
    if supabase_client and business_id:
        try:
            # 1. Upsert tools to the DB
            # First, clean existing tools for the business to keep audits clean
            supabase_client.table("tools").delete().eq("business_id", business_id).execute()
            
            db_tools = []
            for t in tools:
                db_tools.append({
                    "business_id": business_id,
                    "tool_name": t["name"],
                    "vendor": t["vendor"],
                    "category": t["category"],
                    "plan_tier": "Professional",
                    "monthly_cost": float(t["monthlyCost"]),
                    "seats_purchased": int(t["seats"]),
                    "seats_active_estimated": int(t["activeSeats"]),
                    "is_ai_addon": t["id"] in ["t11", "t18"],
                    "source": "csv"
                })
            
            tools_response = supabase_client.table("tools").insert(db_tools).execute()
            inserted_tools = tools_response.data
            
            # 2. Insert findings
            db_findings = []
            for f in findings:
                # Resolve local t-id to database UUID
                original_tool = next((t for t in tools if t["id"] == f["toolId"]), None)
                matched_db_tool = None
                if original_tool:
                    matched_db_tool = next((it for it in inserted_tools if it["tool_name"] == original_tool["name"]), None)
                
                db_findings.append({
                    "business_id": business_id,
                    "tool_id": matched_db_tool["id"] if matched_db_tool else None,
                    "finding_type": f["type"],
                    "description": f["reasoning"],
                    "confidence_score": 0.9 if f["confidence"] == "High" else 0.6 if f["confidence"] == "Medium" else 0.3,
                    "generated_by_agent": f["agent"]
                })
                
            findings_response = supabase_client.table("findings").insert(db_findings).execute()
            inserted_findings = findings_response.data
            
            # 3. Insert recommendations
            db_recs = []
            for r in recs:
                original_f = next((f for f in findings if r["findingId"] == f["id"]), None)
                matched_db_finding = None
                if original_f:
                    matched_db_finding = next((df for df in inserted_findings if df["description"] == original_f["reasoning"]), None)
                    
                db_recs.append({
                    "finding_id": matched_db_finding["id"] if matched_db_finding else None,
                    "action_type": r["action"],
                    "suggested_alternative": r["rationale"],
                    "estimated_monthly_savings": float(r["monthlySavings"]),
                    "estimated_annual_savings": float(r["annualSavings"]),
                    "status": "draft"
                })
            
            supabase_client.table("recommendations").insert(db_recs).execute()
            
            # 4. Insert report
            supabase_client.table("reports").insert({
                "business_id": business_id,
                "total_monthly_savings": float(summary["totalMonthlySavings"]),
                "total_annual_savings": float(summary["totalAnnualSavings"])
            }).execute()
            
            print("Successfully persisted agent audit run to Supabase.")
        except Exception as err:
            print("Failed to persist audit run in Supabase:", err)

    return {
        "tools": tools,
        "findings": findings,
        "recommendations": recs,
        "report": summary,
        "agentTraceSteps": trace_steps
    }
