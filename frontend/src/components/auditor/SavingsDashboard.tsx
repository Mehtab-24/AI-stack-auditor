import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Download, Save, Sparkles, Loader2, CheckCircle } from "lucide-react";
import { CountUp } from "./CountUp";
import { AgentTracePanel } from "./AgentTracePanel";
import { supabase } from "@/lib/supabase";
import {
  totalMonthlySavings,
  totalAnnualSavings,
  totalToolsFlagged,
  totalToolsDiscovered,
  spendByCategory,
  tools as mockTools,
  findings as mockFindings,
  recommendations as mockRecommendations,
} from "@/lib/mockData";

interface SavingsDashboardProps {
  auditResult?: any;
}

export function SavingsDashboard({ auditResult }: SavingsDashboardProps) {
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  // Dynamically resolve data from backend API or fallback to mockData
  const activeTools = auditResult?.tools ?? mockTools;
  const activeFindings = auditResult?.findings ?? mockFindings;
  const activeRecs = auditResult?.recommendations ?? mockRecommendations;

  const currentMonthlySavings =
    auditResult?.report?.totalMonthlySavings ??
    activeFindings.reduce((s: number, f: any) => s + f.monthlySavings, 0);
  const currentAnnualSavings =
    auditResult?.report?.totalAnnualSavings ?? currentMonthlySavings * 12;
  const currentToolsFlagged =
    auditResult?.report?.totalToolsFlagged ?? activeTools.filter((t: any) => t.flagged).length;
  const currentToolsDiscovered = auditResult?.report?.totalToolsDiscovered ?? activeTools.length;

  const currentSpendByCategory = auditResult?.tools
    ? (() => {
        const map = new Map<string, number>();
        for (const t of auditResult.tools) {
          map.set(t.category, (map.get(t.category) ?? 0) + t.monthlyCost);
        }
        return Array.from(map.entries()).map(([category, spend]) => ({ category, spend }));
      })()
    : spendByCategory;

  const stats = [
    { label: "Annual savings", value: currentAnnualSavings, prefix: "$" },
    { label: "Tools flagged", value: currentToolsFlagged },
    { label: "AI tools discovered", value: currentToolsDiscovered },
  ];

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();

      // 1. Cover Header
      doc.setFillColor(15, 15, 18);
      doc.rect(0, 0, 210, 45, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("AI STACK AUDIT REPORT", 14, 28);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 38);

      // 2. Executive Summary Metrics Box
      doc.setFillColor(245, 245, 248);
      doc.roundedRect(14, 55, 182, 45, 3, 3, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text("EXECUTIVE AUDIT SUMMARY", 20, 65);

      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Identified Monthly Savings: $${currentMonthlySavings.toLocaleString()}/mo`, 20, 75);
      doc.text(`Estimated Annual Savings: $${currentAnnualSavings.toLocaleString()}/yr`, 20, 81);
      doc.text(`Total AI Subscriptions Found: ${currentToolsDiscovered}`, 20, 87);
      doc.text(`Subscriptions Flagged for Review: ${currentToolsFlagged}`, 20, 93);

      // 3. Findings Table Header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text("ITEMIZED WASTE FINDINGS", 14, 115);
      doc.text(
        "---------------------------------------------------------------------------------------------------------",
        14,
        120,
      );

      // 4. List Findings
      let y = 128;
      activeFindings.forEach((f: any, idx: number) => {
        const tool = activeTools.find((t: any) => t.id === f.toolId)!;

        // Page break safety check
        if (y > 265) {
          doc.addPage();
          y = 25;
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text(
          `${idx + 1}. ${tool?.name || "AI Tool"} (${f.type}) — Save $${f.monthlySavings}/mo`,
          14,
          y,
        );

        y += 5;
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);

        const splitReasoning = doc.splitTextToSize(`Reasoning: ${f.reasoning}`, 180);
        doc.text(splitReasoning, 14, y);
        y += splitReasoning.length * 4.5 + 4;

        if (f.suggestedAlternative) {
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(21, 122, 60);
          doc.text(`Actionable Alternative: ${f.suggestedAlternative}`, 14, y);
          y += 6;
        }

        y += 3; // spacing between findings
      });

      // Save PDF file
      doc.save(`AI-Stack-Audit-Report-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF audit report downloaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF report.");
    }
  };

  const normalizeFindingType = (type: string): string | null => {
    if (!type) return null;
    const clean = type.toLowerCase().trim().replace(/[-_]/g, " ");
    if (clean.includes("duplicate") || clean.includes("overlap") || clean.includes("redundant") || clean.includes("consolidate")) return "duplicate";
    if (clean.includes("underused") || clean.includes("underuse") || clean.includes("underutili") || clean.includes("utili") || clean.includes("unused")) return "underused";
    if (clean.includes("price") || clean.includes("tier") || clean.includes("cost") || clean.includes("overprice")) return "overpriced_tier";
    if (clean.includes("seat") || clean.includes("inactive")) return "inactive_seats";
    if (clean.includes("addon") || clean.includes("add on") || clean.includes("hidden")) return "hidden_addon";
    if (clean.includes("renewal") || clean.includes("risk") || clean.includes("expire")) return "renewal_risk";
    return null;
  };

  const normalizeActionType = (action: string): string | null => {
    if (!action) return null;
    const clean = action.toLowerCase().trim().replace(/[-_]/g, " ");
    if (clean.includes("retain") || clean.includes("keep") || clean.includes("save")) return "retain";
    if (clean.includes("downgrade") || clean.includes("lower") || clean.includes("reduce")) return "downgrade";
    if (clean.includes("cancel") || clean.includes("remove") || clean.includes("delete")) return "cancel";
    if (clean.includes("consolidate") || clean.includes("merge") || clean.includes("combine")) return "consolidate";
    if (clean.includes("renewal") || clean.includes("review")) return "review_renewal";
    return null;
  };

  const handleSaveReport = async () => {
    if (!session) {
      toast.error("Please sign in to save reports to your account.");
      return;
    }

    setSaving(true);
    try {
      // 1. Get user business record
      const { data: business, error: busError } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (busError) throw busError;

      let businessId = business?.id;
      if (!businessId) {
        // Create one if it is missing
        const { data: newBus, error: createError } = await supabase
          .from("businesses")
          .insert({
            user_id: session.user.id,
            name: `${session.user.email.split("@")[0]}'s Organization`,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        businessId = newBus.id;
      }

      // 2. Insert tools to DB
      // Clear out older tools first for simple replacement logic in this demo/MVP
      await supabase.from("tools").delete().eq("business_id", businessId);

      const toolsToInsert = activeTools.map((t: any) => ({
        business_id: businessId,
        tool_name: t.name,
        vendor: t.vendor,
        category: t.category,
        plan_tier: "Professional",
        monthly_cost: t.monthlyCost,
        seats_purchased: t.seats,
        seats_active_estimated: t.activeSeats,
        is_ai_addon: t.id === "t11" || t.id === "t18",
        source: "csv",
      }));

      const { data: insertedTools, error: toolsError } = await supabase
        .from("tools")
        .insert(toolsToInsert)
        .select();

      if (toolsError) throw toolsError;

      // 3. Insert findings
      const findingsToInsert: any[] = [];
      const findingIdMap = new Map<string, string>(); // client-side ID -> DB ID

      activeFindings.forEach((f: any) => {
        const mappedType = normalizeFindingType(f.type);
        if (!mappedType) {
          console.warn("Skipping finding due to check constraint mismatch:", f);
          return;
        }

        const correspondingTool = insertedTools.find(
          (it) => it.tool_name === activeTools.find((ot: any) => ot.id === f.toolId)?.name,
        );

        findingsToInsert.push({
          business_id: businessId,
          tool_id: correspondingTool?.id || null,
          finding_type: mappedType,
          description: f.reasoning,
          confidence_score: f.confidence === "High" ? 0.9 : f.confidence === "Medium" ? 0.6 : 0.3,
          generated_by_agent: f.agent,
          _client_id: f.id, // temporary tracking key
        });
      });

      if (findingsToInsert.length > 0) {
        const cleanFindings = findingsToInsert.map(({ _client_id, ...rest }) => rest);
        const { data: insertedFindings, error: findingsError } = await supabase
          .from("findings")
          .insert(cleanFindings)
          .select();

        if (findingsError) throw findingsError;

        if (insertedFindings && insertedFindings.length === findingsToInsert.length) {
          insertedFindings.forEach((dbFinding, index) => {
            const originalId = findingsToInsert[index]._client_id;
            findingIdMap.set(originalId, dbFinding.id);
          });
        }
      }

      // 4. Insert recommendations
      const recsToInsert: any[] = [];
      activeRecs.forEach((r: any) => {
        const mappedAction = normalizeActionType(r.action);
        if (!mappedAction) {
          console.warn("Skipping recommendation due to check constraint mismatch:", r);
          return;
        }

        const dbFindingId = findingIdMap.get(r.findingId);
        if (!dbFindingId) {
          console.warn("Skipping recommendation because parent finding was skipped or not found in DB:", r);
          return;
        }

        recsToInsert.push({
          finding_id: dbFindingId,
          action_type: mappedAction,
          suggested_alternative: r.rationale,
          estimated_monthly_savings: r.monthlySavings,
          estimated_annual_savings: r.annualSavings,
          status: "draft",
        });
      });

      if (recsToInsert.length > 0) {
        const { error: recsError } = await supabase.from("recommendations").insert(recsToInsert);
        if (recsError) throw recsError;
      }

      // 5. Insert final report summary
      const { error: reportError } = await supabase.from("reports").insert({
        business_id: businessId,
        total_monthly_savings: currentMonthlySavings,
        total_annual_savings: currentAnnualSavings,
      });

      if (reportError) throw reportError;

      setIsSaved(true);
      toast.success("Audit report saved successfully! You can view it anytime in your Audit History.");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save report. Please check your network connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] py-10 space-y-8 w-full">
      {/* Top Banner Actions */}
      <section className="md:px-[111px] px-8 w-full flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="text-left space-y-2">
          <p
            className="text-[#B8B8B8] dark:text-[#828282] text-[18px]"
            style={{
              fontFamily: "'Product Sans', sans-serif",
              fontWeight: 400,
              lineHeight: "100%",
              letterSpacing: "0%",
            }}
          >
            Audit Dashboard
          </p>
          <h2
            className="text-[#1E1E1E] dark:text-[#FFFFFF] text-[30px]"
            style={{
              fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
              fontWeight: 500,
              lineHeight: "100%",
              letterSpacing: "0%",
            }}
          >
            Rationalization Summary
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {session && (
            isSaved ? (
              <div className="nav-tab-border" style={{ backgroundColor: isDark ? "#1a1c2e" : "#e6e6e6" }}>
                <button
                  disabled
                  className="nav-tab-content px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-not-allowed"
                  style={{
                    fontFamily: "'Product Sans', sans-serif",
                    fontWeight: 400,
                    backgroundColor: isDark ? "#1a1c2e" : "#e6e6e6",
                    color: isDark ? "#b8b8b8" : "#555555",
                  }}
                >
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Saved
                </button>
              </div>
            ) : (
              <div className="nav-tab-border">
                <button
                  onClick={handleSaveReport}
                  disabled={saving}
                  className="nav-tab-content px-4 py-2.5 transition cursor-pointer nav-tab-active text-xs font-semibold text-black flex items-center gap-2"
                  style={{
                    fontFamily: "'Product Sans', sans-serif",
                    fontWeight: 400,
                  }}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {saving ? "Saving..." : "Save Report"}
                </button>
              </div>
            )
          )}
          <div className="nav-tab-border">
            <button
              onClick={handleDownloadPDF}
              className="nav-tab-content px-4 py-2.5 transition cursor-pointer nav-tab-active text-xs font-semibold text-black flex items-center gap-2"
              style={{
                fontFamily: "'Product Sans', sans-serif",
                fontWeight: 400,
              }}
            >
              <Download className="h-3.5 w-3.5" /> Download Report
            </button>
          </div>
        </div>
      </section>

      {/* Monthly Savings Large Display */}
      <section className="md:px-[111px] px-8 w-full text-center py-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold font-sans">
          Estimated Monthly Savings
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-2 text-7xl font-bold tracking-tight text-[#22D97A] dark:text-[#22D97A] sm:text-8xl"
        >
          <CountUp to={currentMonthlySavings} prefix="$" suffix="/mo" />
        </motion.div>
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground leading-relaxed">
          Across your AI subscriptions. Review the findings and approve actions to lock in savings —
          nothing is cancelled automatically.
        </p>
      </section>

      {/* Cards stats grid */}
      <section className="md:px-[111px] px-8 w-full grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            className="cut-br-border dashboard-box-border"
          >
            <div className="cut-br-content dashboard-box-content p-6 h-full flex flex-col justify-between">
              <div className="dashboard-box-heading uppercase">{s.label}</div>
              <div className="dashboard-box-value mt-2">
                <CountUp to={s.value} prefix={s.prefix ?? ""} />
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Chart and trace panel side-by-side */}
      <section className="md:px-[111px] px-8 w-full grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 cut-tr-border dashboard-box-border graph-box">
          <div className="cut-tr-content dashboard-box-content p-6 h-full flex flex-col">
            <div className="mb-4">
              <h3 className="dashboard-box-heading">Spend by Category</h3>
              <p className="text-xs text-muted-foreground mt-1">Monthly software expense in USD</p>
            </div>
            <div className="flex-1 w-full pr-20 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentSpendByCategory} margin={{ left: -20 }}>
                  <XAxis
                    dataKey="category"
                    stroke="var(--color-muted-foreground)"
                    fontSize={13}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={13}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)", opacity: 0.2 }}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 14,
                      color: "var(--color-foreground)",
                    }}
                  />
                  <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
                    {currentSpendByCategory.map((_, i) => (
                      <Cell key={i} fill="var(--color-accent)" fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="cut-tl-border dashboard-box-border flowchart-box">
          <div className="cut-tl-content dashboard-box-content p-6 h-full">
            <AgentTracePanel steps={auditResult?.agentTraceSteps} compact noBorder />
          </div>
        </div>
      </section>
    </div>
  );
}
