import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  // Dynamically resolve data from backend API or fallback to mockData
  const activeTools = auditResult?.tools ?? mockTools;
  const activeFindings = auditResult?.findings ?? mockFindings;
  const activeRecs = auditResult?.recommendations ?? mockRecommendations;

  const currentMonthlySavings = auditResult?.report?.totalMonthlySavings ?? 
    activeFindings.reduce((s: number, f: any) => s + f.monthlySavings, 0);
  const currentAnnualSavings = auditResult?.report?.totalAnnualSavings ?? (currentMonthlySavings * 12);
  const currentToolsFlagged = auditResult?.report?.totalToolsFlagged ?? 
    activeTools.filter((t: any) => t.flagged).length;
  const currentToolsDiscovered = auditResult?.report?.totalToolsDiscovered ?? activeTools.length;

  const currentSpendByCategory = auditResult?.tools ? (() => {
    const map = new Map<string, number>();
    for (const t of auditResult.tools) {
      map.set(t.category, (map.get(t.category) ?? 0) + t.monthlyCost);
    }
    return Array.from(map.entries()).map(([category, spend]) => ({ category, spend }));
  })() : spendByCategory;

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
      doc.text("---------------------------------------------------------------------------------------------------------", 14, 120);

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
        doc.text(`${idx + 1}. ${tool?.name || "AI Tool"} (${f.type}) — Save $${f.monthlySavings}/mo`, 14, y);
        
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
      doc.save(`AI-Stack-Audit-Report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF audit report downloaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF report.");
    }
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
      const findingsToInsert = activeFindings.map((f: any) => {
        const correspondingTool = insertedTools.find(
          (it) => it.tool_name === activeTools.find((ot: any) => ot.id === f.toolId)?.name
        );
        return {
          business_id: businessId,
          tool_id: correspondingTool?.id || null,
          finding_type: f.type,
          description: f.reasoning,
          confidence_score: f.confidence === "High" ? 0.9 : f.confidence === "Medium" ? 0.6 : 0.3,
          generated_by_agent: f.agent,
        };
      });

      const { data: insertedFindings, error: findingsError } = await supabase
        .from("findings")
        .insert(findingsToInsert)
        .select();

      if (findingsError) throw findingsError;

      // 4. Insert recommendations
      const recsToInsert = activeRecs.map((r: any) => {
        const originalFinding = activeFindings.find((f: any) => r.findingId === f.id)!;
        const matchingFinding = insertedFindings.find(
          (f) => f.finding_type === originalFinding.type && f.description === originalFinding.reasoning
        );
        return {
          finding_id: matchingFinding?.id,
          action_type: r.action,
          suggested_alternative: r.rationale,
          estimated_monthly_savings: r.monthlySavings,
          estimated_annual_savings: r.annualSavings,
          status: "draft",
        };
      });

      const { error: recsError } = await supabase
        .from("recommendations")
        .insert(recsToInsert);

      if (recsError) throw recsError;

      // 5. Insert final report summary
      const { error: reportError } = await supabase.from("reports").insert({
        business_id: businessId,
        total_monthly_savings: currentMonthlySavings,
        total_annual_savings: currentAnnualSavings,
      });

      if (reportError) throw reportError;

      setIsSaved(true);
      toast.success("Audit report successfully synchronized with Supabase!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to persist report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      {/* Top Banner Actions */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="text-left">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Audit Dashboard</div>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">Rationalization Summary</h2>
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <button
              onClick={handleSaveReport}
              disabled={saving || isSaved}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition ${
                isSaved
                  ? "bg-muted text-muted-foreground border border-border"
                  : "bg-card border border-border text-foreground hover:bg-muted/40"
              }`}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isSaved ? (
                <CheckCircle className="h-3.5 w-3.5 text-accent" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? "Saving..." : isSaved ? "Saved" : "Save Report"}
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-black shadow-lg shadow-accent/15 transition hover:bg-accent/90"
          >
            <Download className="h-3.5 w-3.5" /> Download Report
          </button>
        </div>
      </section>

      {/* Monthly Savings Large Display */}
      <section className="text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Estimated Monthly Savings
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-2 text-6xl font-semibold tracking-tight text-accent sm:text-8xl"
        >
          <CountUp to={currentMonthlySavings} prefix="$" suffix="/mo" />
        </motion.div>
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground leading-relaxed">
          Across your AI subscriptions. Review the findings and approve actions to lock in
          savings — nothing is cancelled automatically.
        </p>
      </section>

      {/* Cards stats grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</div>
            <div className="mt-2 text-3xl font-semibold text-foreground">
              <CountUp to={s.value} prefix={s.prefix ?? ""} />
            </div>
          </motion.div>
        ))}
      </section>

      {/* Chart and trace panel side-by-side */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Spend by Category</h3>
            <p className="text-xs text-muted-foreground">Monthly software expense in USD</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentSpendByCategory} margin={{ left: -20 }}>
                <XAxis
                  dataKey="category"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.2 }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
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
        <AgentTracePanel steps={auditResult?.agentTraceSteps} compact />
      </section>
    </div>
  );
}
