import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Sparkles, Loader2, DollarSign, AlertTriangle, ShieldCheck, TrendingDown, HelpCircle } from "lucide-react";
import { tools as mockTools } from "@/lib/mockData";

interface StackSimulatorProps {
  auditResult?: any;
}

export function StackSimulator({ auditResult }: StackSimulatorProps) {
  const activeTools = auditResult?.tools ?? mockTools;
  const originalCost = activeTools.reduce((s: number, t: any) => s + (t.monthlyCost || t.monthly_cost || 0), 0);

  const [hypothetical, setHypothetical] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hypothetical.trim()) return;

    setLoading(true);
    setError(null);

    // Map tools to the backend schema format
    const mappedTools = activeTools.map((t: any) => ({
      id: t.id,
      tool_name: t.name || t.tool_name,
      vendor: t.vendor,
      category: t.category,
      monthly_cost: t.monthlyCost || t.monthly_cost || 0,
      plan_tier: t.plan_tier || "standard",
      seats_purchased: t.seats || t.seats_purchased || 1,
      seats_active_estimated: t.activeSeats || t.seats_active_estimated,
      is_ai_addon: t.is_ai_addon || false,
      source: t.source || "csv",
      renewal_date: t.renewal_date,
    }));

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tools: mappedTools,
          hypothetical: hypothetical,
        }),
      });

      if (!response.ok) {
        throw new Error(`Simulation request failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.warn("Backend simulator failed, falling back to client-side heuristics:", err);
      // Run local client-side backup simulation heuristics
      runLocalSimulation(mappedTools, hypothetical.toLowerCase().trim());
    } finally {
      setLoading(false);
    }
  };

  const runLocalSimulation = (toolsList: any[], text: string) => {
    const totalOriginal = toolsList.reduce((s, t) => s + t.monthly_cost, 0);
    
    // Heuristic 1: Replace scenario
    if (text.includes("replace") || text.includes("swap") || text.includes("switch") || text.includes("migrate")) {
      // Find what's being swapped
      let oldName = "";
      let newName = "Alternative Service";
      
      const replaceRegex = /(?:replace|swap|switch)\s+(.+?)\s+(?:with|for|to)\s+(.+)/;
      const match = text.match(replaceRegex);
      if (match) {
        oldName = match[1].trim();
        newName = match[2].trim();
      }

      // Look up tool
      const foundTool = toolsList.find(t => 
        t.tool_name.toLowerCase() === oldName || 
        t.tool_name.toLowerCase().includes(oldName) ||
        oldName.includes(t.tool_name.toLowerCase())
      );

      if (!foundTool) {
        setResult({
          original_monthly_cost: totalOriginal,
          predicted_monthly_cost: totalOriginal,
          predicted_annual_cost: totalOriginal * 12,
          savings_delta: 0,
          productivity_impact: `Could not find '${oldName}' in your current active subscriptions.`,
          risk_score: 1.0,
          recommendation: "Verify that the name matches a subscription in your dashboard list.",
        });
        return;
      }

      const estimatedCost = foundTool.monthly_cost * 0.7; // assume 30% savings
      const predicted = totalOriginal - foundTool.monthly_cost + estimatedCost;
      const savings = totalOriginal - predicted;

      setResult({
        original_monthly_cost: totalOriginal,
        predicted_monthly_cost: Math.round(predicted),
        predicted_annual_cost: Math.round(predicted * 12),
        savings_delta: Math.round(savings),
        productivity_impact: `Replacing ${foundTool.tool_name} with ${newName} will yield around $${Math.round(savings)}/mo savings. Operational disruption is moderate.`,
        risk_score: 4.5,
        recommendation: `Trial ${newName} with a pilot group (5 seats) first to ensure feature parity before full migration.`,
      });
      return;
    }

    // Heuristic 2: Reduce scenario
    if (text.includes("reduce") || text.includes("cut") || text.includes("decrease") || text.includes("lower")) {
      const match = text.match(/(\d+)\s*%/);
      const pct = match ? parseInt(match[1]) / 100 : 0.20;
      
      const targetSavings = totalOriginal * pct;
      const predicted = totalOriginal - targetSavings;

      setResult({
        original_monthly_cost: totalOriginal,
        predicted_monthly_cost: Math.round(predicted),
        predicted_annual_cost: Math.round(predicted * 12),
        savings_delta: Math.round(targetSavings),
        productivity_impact: `A ${Math.round(pct * 100)}% budget cut requires consolidating duplicate functions in writing/coding and removing unused seats.`,
        risk_score: Math.min(Math.round(pct * 15), 9),
        recommendation: pct <= 0.20 
          ? "Target underused seats in meetings/writing first; this is highly achievable."
          : "An aggressive reduction requires team consolidation. Plan a standard migration roadmap.",
      });
      return;
    }

    // Heuristic 3: Remove scenario
    if (text.includes("remove") || text.includes("cancel") || text.includes("drop") || text.includes("eliminate")) {
      let toolName = text.replace(/(?:remove|cancel|drop|eliminate)\s+/, "").trim();
      
      const foundTool = toolsList.find(t => 
        t.tool_name.toLowerCase() === toolName || 
        t.tool_name.toLowerCase().includes(toolName) ||
        toolName.includes(t.tool_name.toLowerCase())
      );

      if (!foundTool) {
        setResult({
          original_monthly_cost: totalOriginal,
          predicted_monthly_cost: totalOriginal,
          predicted_annual_cost: totalOriginal * 12,
          savings_delta: 0,
          productivity_impact: `Could not find '${toolName}' in your active subscriptions.`,
          risk_score: 1.0,
          recommendation: "Ensure spelling matches the subscription name on your dashboard.",
        });
        return;
      }

      const predicted = totalOriginal - foundTool.monthly_cost;
      setResult({
        original_monthly_cost: totalOriginal,
        predicted_monthly_cost: Math.round(predicted),
        predicted_annual_cost: Math.round(predicted * 12),
        savings_delta: Math.round(foundTool.monthly_cost),
        productivity_impact: `Cancelling ${foundTool.tool_name} drops category costs to zero. This affects ${foundTool.seats_active_estimated || foundTool.seats_purchased} active seat(s).`,
        risk_score: 5.5,
        recommendation: `Confirm another tool covers the ${foundTool.category} job function before cancelling.`,
      });
      return;
    }

    // Heuristic 4: Generic fallback
    setResult({
      original_monthly_cost: totalOriginal,
      predicted_monthly_cost: totalOriginal,
      predicted_annual_cost: totalOriginal * 12,
      savings_delta: 0,
      productivity_impact: "Could not identify a standard simulation phrase.",
      risk_score: 2.0,
      recommendation: "Try phrasing your test like: 'replace Cursor with Copilot', 'cancel Jasper', or 'reduce spend by 25%'.",
    });
  };

  const getRiskColor = (score: number) => {
    if (score < 3) return "bg-emerald-500 text-emerald-500 border-emerald-500/20";
    if (score < 6) return "bg-amber-500 text-amber-500 border-amber-500/20";
    return "bg-rose-500 text-rose-500 border-rose-500/20";
  };

  return (
    <div className="mx-auto max-w-[1400px] py-10 space-y-8">
      {/* Page Header */}
      <section className="md:px-[111px] px-8 w-full flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <h2
            className="text-[#1E1E1E] dark:text-[#FFFFFF] text-[30px]"
            style={{
              fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
              fontWeight: 500,
              lineHeight: "100%",
              letterSpacing: "0%",
            }}
          >
            Stack Simulator
          </h2>
          <p
            className="text-[#B8B8B8] dark:text-[#828282] text-[18px]"
            style={{
              fontFamily: "'Product Sans', sans-serif",
              fontWeight: 400,
              lineHeight: "100%",
              letterSpacing: "0%",
            }}
          >
            What-If Analysis
          </p>
        </div>
      </section>

      {/* Simulator Interface */}
      <div className="md:px-[111px] px-8 w-full">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Input Panel */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm h-fit">
            <div className="mb-4">
              <h3
                className="text-[#1E1E1E] dark:text-[#FFFFFF]"
                style={{
                  fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "16px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                }}
              >
                Hypothetical scenario
              </h3>
              <p
                className="text-[#B8B8B8] mt-1.5"
                style={{
                  fontFamily: "'Product Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                }}
              >
                Describe a budget change or tool migration
              </p>
            </div>

          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <textarea
                value={hypothetical}
                onChange={(e) => setHypothetical(e.target.value)}
                placeholder="e.g. Swap Tabnine for GitHub Copilot, cancel Jasper, or reduce spending by 30%"
                required
                disabled={loading}
                className="w-full h-32 rounded-2xl border border-border bg-muted/20 p-4 text-sm text-foreground placeholder-muted-foreground/50 outline-none transition focus:border-accent focus:bg-background focus:ring-1 focus:ring-accent resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !hypothetical.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-semibold text-black shadow-lg shadow-accent/15 transition hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="h-4 w-4 fill-black" /> Run Simulation
                </>
              )}
            </button>
          </form>

          {/* Quick Examples */}
          <div className="mt-6 border-t border-border pt-4">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-2">
              Try these phrases:
            </span>
            <div className="flex flex-col gap-1.5">
              {[
                "Replace Tabnine with GitHub Copilot",
                "Cancel Jasper AI",
                "Reduce spend by 25%",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setHypothetical(ex)}
                  className="text-left text-xs text-accent hover:underline cursor-pointer"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {!result ? (
              /* EMPTY RESULT STATE */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 p-16 text-center h-full min-h-[300px]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground/60">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h4
                  className="text-[#1E1E1E] dark:text-[#FFFFFF]"
                  style={{
                    fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "16px",
                    lineHeight: "100%",
                    letterSpacing: "0%",
                  }}
                >
                  Simulation Results
                </h4>
                <p
                  className="max-w-xs text-[#B8B8B8] mt-1.5"
                  style={{
                    fontFamily: "'Product Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: "12px",
                    lineHeight: "100%",
                    letterSpacing: "0%",
                  }}
                >
                  Describe a hypothetical change on the left and run the simulation to see projected costs, savings, and organizational risk.
                </p>
              </motion.div>
            ) : (
              /* RESULT DISPLAY */
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Cost Delta Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Current Cost */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Current Cost
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground">
                      ${originalCost.toLocaleString()}/mo
                    </div>
                  </div>

                  {/* Projected Cost */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Projected Cost
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground">
                      ${result.predicted_monthly_cost.toLocaleString()}/mo
                    </div>
                  </div>

                  {/* Savings Delta */}
                  <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-accent tracking-wider">
                      Savings Delta
                    </div>
                    <div className="mt-2 text-2xl font-bold text-accent">
                      ${result.savings_delta.toLocaleString()}/mo
                    </div>
                  </div>
                </div>

                {/* Impact details */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
                  <h4
                    className="text-[#1E1E1E] dark:text-[#FFFFFF] border-b border-border pb-3"
                    style={{
                      fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: "16px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                    }}
                  >
                    Impact & Risk Analysis
                  </h4>

                  {/* Risk Score */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-foreground">Implementation Risk</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Operational disruption score out of 10
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-xl border px-3 py-1 text-xs font-bold ${getRiskColor(result.risk_score)} bg-opacity-5`}>
                        {result.risk_score}/10
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.risk_score * 10}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        result.risk_score < 3 
                          ? "bg-emerald-500" 
                          : result.risk_score < 6 
                            ? "bg-amber-500" 
                            : "bg-rose-500"
                      }`}
                    />
                  </div>

                  {/* Productivity impact details */}
                  <div className="flex gap-3.5 bg-muted/20 border border-border/40 rounded-2xl p-4 text-xs">
                    <TrendingDown className="h-5 w-5 shrink-0 text-muted-foreground/80" />
                    <div>
                      <span className="font-semibold text-foreground block mb-0.5">Productivity Impact</span>
                      <p className="text-muted-foreground leading-relaxed">{result.productivity_impact}</p>
                    </div>
                  </div>

                  {/* Recommendation details */}
                  <div className="flex gap-3.5 bg-accent/5 border border-accent/15 rounded-2xl p-4 text-xs">
                    {result.risk_score < 5 ? (
                      <ShieldCheck className="h-5 w-5 shrink-0 text-accent" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                    )}
                    <div>
                      <span className="font-semibold text-foreground block mb-0.5">Auditor Recommendation</span>
                      <p className="text-muted-foreground leading-relaxed">{result.recommendation}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
  );
}
