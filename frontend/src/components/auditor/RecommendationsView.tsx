import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RotateCcw } from "lucide-react";
import { recommendations as mockRecommendations, type ActionType } from "@/lib/mockData";
import { CountUp } from "./CountUp";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Status = "pending" | "approved" | "dismissed";

const actionStyles: Record<ActionType, string> = {
  Retain: "bg-muted text-muted-foreground border-border",
  Downgrade: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  Cancel: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  Consolidate: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  "Review Renewal": "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
};

interface RecommendationsViewProps {
  auditResult?: any;
}

export function RecommendationsView({ auditResult }: RecommendationsViewProps) {
  const activeRecs = auditResult?.recommendations ?? mockRecommendations;

  const [state, setState] = useState<Record<string, Status>>({});
  const [session, setSession] = useState<any>(null);

  // Initialize recommendation states when activeRecs updates
  useEffect(() => {
    setState(Object.fromEntries(activeRecs.map((r: any) => [r.id, "pending" as Status])));
  }, [activeRecs]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const approvedMonthly = useMemo(
    () =>
      activeRecs
        .filter((r: any) => state[r.id] === "approved")
        .reduce((s: number, r: any) => s + r.monthlySavings, 0),
    [state, activeRecs],
  );

  const updateRecommendationStatus = async (r: any, newStatus: Status) => {
    // 1. Update local React state
    setState((s) => ({ ...s, [r.id]: newStatus }));

    // 2. If signed in, synchronize status back to Supabase
    if (session) {
      try {
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!business) return;

        const dbStatus = newStatus === "approved" ? "approved" : newStatus === "dismissed" ? "dismissed" : "draft";

        // Query related findings
        const { data: dbFindings } = await supabase
          .from("findings")
          .select("id")
          .eq("business_id", business.id);

        if (!dbFindings || dbFindings.length === 0) return;
        const findingIds = dbFindings.map((df) => df.id);

        // Perform the status write to public.recommendations
        const { error } = await supabase
          .from("recommendations")
          .update({ status: dbStatus })
          .in("finding_id", findingIds)
          .eq("action_type", r.action)
          .eq("estimated_monthly_savings", r.monthlySavings);

        if (error) {
          console.warn("Failed to synchronize recommendation status with database:", error);
        } else {
          toast.success(`Action updated: ${newStatus}`);
        }
      } catch (err) {
        console.error("Fuzzy status sync error:", err);
      }
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Recommendations</h2>
          <p className="text-sm text-muted-foreground">
            Draft actions — nothing is executed until you approve.
          </p>
        </div>
        <div className="rounded-2xl border border-accent/20 bg-accent/5 px-6 py-3.5 text-right shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-accent/80">
            Confirmed Savings
          </div>
          <div className="text-3xl font-bold text-accent">
            <CountUp to={approvedMonthly} prefix="$" suffix="/mo" duration={500} />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <AnimatePresence initial={false}>
          {activeRecs.map((r: any) => {
            const status = state[r.id] || "pending";
            return (
              <motion.div
                key={r.id}
                layout
                animate={{
                  backgroundColor:
                    status === "approved"
                      ? "var(--color-accent-solid)"
                      : status === "dismissed"
                        ? "rgba(0,0,0,0.01)"
                        : "var(--color-card)",
                  opacity: status === "dismissed" ? 0.45 : 1,
                }}
                className={`flex flex-wrap items-center gap-4 border-b border-border/60 p-5 last:border-b-0 transition-colors ${
                  status === "approved" ? "bg-accent/5 dark:bg-accent/5" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-foreground">{r.toolName}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${actionStyles[r.action as ActionType] || "bg-muted text-muted-foreground"}`}
                    >
                      {r.action}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.rationale}</div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums text-accent">
                    ${r.monthlySavings}/mo
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 tabular-nums">
                    ${r.annualSavings.toLocaleString()}/yr
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {status === "approved" ? (
                    <span className="flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent animate-in fade-in zoom-in duration-200">
                      <Check className="h-3.5 w-3.5" /> Approved
                    </span>
                  ) : status === "dismissed" ? (
                    <button
                      onClick={() => updateRecommendationStatus(r, "pending")}
                      className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground shadow-sm"
                    >
                      <RotateCcw className="h-3 w-3" /> Restore
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => updateRecommendationStatus(r, "approved")}
                        className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent/90 shadow-lg shadow-accent/15"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateRecommendationStatus(r, "dismissed")}
                        className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground shadow-sm"
                        aria-label="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
