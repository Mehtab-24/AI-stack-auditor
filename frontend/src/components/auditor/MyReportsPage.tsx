import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Loader2, DollarSign, Calendar, ChevronRight, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MyReportsPageProps {
  session: any;
  onNewAudit: () => void;
  onLoadReport: (reportData: any) => void;
}

export function MyReportsPage({ session, onNewAudit, onLoadReport }: MyReportsPageProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [session]);

  const fetchReports = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch user's business
      const { data: business, error: busError } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (busError) throw busError;
      if (!business) {
        setReports([]);
        setLoading(false);
        return;
      }

      // 2. Fetch past reports for this business
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .eq("business_id", business.id)
        .order("generated_at", { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);
    } catch (err: any) {
      console.error("Error fetching reports:", err);
      setError("Failed to load past audit reports.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadReportDetails = async (report: any) => {
    setLoading(true);
    try {
      const businessId = report.business_id;

      // 1. Fetch tools
      const { data: dbTools, error: toolsError } = await supabase
        .from("tools")
        .select("*")
        .eq("business_id", businessId);
      if (toolsError) throw toolsError;

      // 2. Fetch findings
      const { data: dbFindings, error: findingsError } = await supabase
        .from("findings")
        .select("*")
        .eq("business_id", businessId);
      if (findingsError) throw findingsError;

      // 3. Fetch recommendations
      let dbRecs: any[] = [];
      if (dbFindings && dbFindings.length > 0) {
        const findingIds = dbFindings.map((f) => f.id);
        const { data: recs, error: recsError } = await supabase
          .from("recommendations")
          .select("*")
          .in("finding_id", findingIds);
        if (recsError) throw recsError;
        dbRecs = recs || [];
      }

      // 4. Map DB tools back to UI representation
      const tools = (dbTools || []).map((t: any) => ({
        id: t.id,
        name: t.tool_name,
        vendor: t.vendor,
        category: t.category,
        monthlyCost: Number(t.monthly_cost),
        seats: t.seats_purchased,
        activeSeats: t.seats_active_estimated,
        flagged: dbFindings.some((f: any) => f.tool_id === t.id),
      }));

      // 5. Map DB findings
      const findings = (dbFindings || []).map((f: any) => {
        const rec = dbRecs.find((r) => r.finding_id === f.id);
        return {
          id: f.id,
          toolId: f.tool_id,
          type: f.finding_type,
          confidence: f.confidence_score >= 0.8 ? "High" : f.confidence_score >= 0.5 ? "Medium" : "Low",
          agent: f.generated_by_agent,
          reasoning: f.description,
          suggestedAlternative: rec?.suggested_alternative,
          monthlySavings: rec ? Number(rec.estimated_monthly_savings) : 0,
        };
      });

      // 6. Map DB recommendations
      const recommendations = dbRecs.map((r: any) => {
        const finding = dbFindings.find((f: any) => f.id === r.finding_id);
        const tool = dbTools.find((t: any) => t.id === finding?.tool_id);
        return {
          id: r.id,
          findingId: r.finding_id,
          toolName: tool?.tool_name || "Unknown Tool",
          action: r.action_type,
          monthlySavings: Number(r.estimated_monthly_savings),
          annualSavings: Number(r.estimated_annual_savings),
          rationale: r.suggested_alternative || finding?.description || "",
        };
      });

      // Assemble auditResult structure
      const reportObject = {
        tools,
        findings,
        recommendations,
        report: {
          totalMonthlySavings: Number(report.total_monthly_savings),
          totalAnnualSavings: Number(report.total_annual_savings),
          totalToolsDiscovered: tools.length,
          totalToolsFlagged: tools.filter((t) => t.flagged).length,
        },
        agentTraceSteps: [
          {
            agent: "Discovery Agent",
            label: "Discovery",
            running: "Completed",
            result: `Retrieved ${tools.length} tools from database`,
          },
          {
            agent: "Action Agent",
            label: "Report",
            running: "Completed",
            result: `Report loaded from Supabase historical records`,
          },
        ],
      };

      onLoadReport(reportObject);
    } catch (err: any) {
      console.error("Error loading report details:", err);
      setError("Failed to load historical audit details.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <span className="text-sm text-muted-foreground">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Audit Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access and manage your company&apos;s past spend rationalization reports
          </p>
        </div>
        <button
          onClick={onNewAudit}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-black shadow-lg shadow-accent/15 transition hover:bg-accent/90 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> New Audit
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive-foreground">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-destructive" />
          <div className="font-medium">{error}</div>
        </div>
      )}

      {reports.length === 0 ? (
        /* EMPTY STATE */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-12 text-center shadow-sm"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground/60">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No reports yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            You haven&apos;t run or saved any spend audits. Upload a CSV invoice export to run an audit.
          </p>
          <button
            onClick={onNewAudit}
            className="mt-6 flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-accent/90 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Run First Audit
          </button>
        </motion.div>
      ) : (
        /* REPORTS LIST */
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saved Reports ({reports.length})
          </h2>
          <div className="grid gap-3">
            {reports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleLoadReportDetails(report)}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-accent/40 hover:bg-accent/[0.01] cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/30 text-foreground/75">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      AI Stack Audit Report
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.generated_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-base font-bold text-accent">
                      Save ${Number(report.total_monthly_savings).toLocaleString()}/mo
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      ${Number(report.total_annual_savings).toLocaleString()}/yr est. savings
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
