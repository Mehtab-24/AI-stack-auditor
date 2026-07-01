import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { recommendations, type ActionType } from "@/lib/mockData";
import { CountUp } from "./CountUp";

type Status = "pending" | "approved" | "dismissed";

const actionStyles: Record<ActionType, string> = {
  Retain: "bg-white/10 text-white/70 border-white/15",
  Downgrade: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  Cancel: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  Consolidate: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  "Review Renewal": "bg-orange-500/15 text-orange-300 border-orange-500/20",
};

export function RecommendationsView() {
  const [state, setState] = useState<Record<string, Status>>(() =>
    Object.fromEntries(recommendations.map((r) => [r.id, "pending" as Status])),
  );

  const approvedMonthly = useMemo(
    () =>
      recommendations
        .filter((r) => state[r.id] === "approved")
        .reduce((s, r) => s + r.monthlySavings, 0),
    [state],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Recommendations</h2>
          <p className="text-sm text-white/50">
            Draft actions — nothing runs until you approve.
          </p>
        </div>
        <div className="rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3 text-right">
          <div className="text-[11px] uppercase tracking-wider text-accent/80">
            Approved savings
          </div>
          <div className="text-2xl font-semibold text-accent">
            <CountUp to={approvedMonthly} prefix="$" suffix="/mo" duration={500} />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <AnimatePresence initial={false}>
          {recommendations.map((r) => {
            const status = state[r.id];
            return (
              <motion.div
                key={r.id}
                layout
                animate={{
                  backgroundColor:
                    status === "approved"
                      ? "rgba(34,217,122,0.06)"
                      : status === "dismissed"
                        ? "rgba(255,255,255,0.01)"
                        : "rgba(255,255,255,0)",
                  opacity: status === "dismissed" ? 0.45 : 1,
                }}
                className="flex flex-wrap items-center gap-4 border-b border-white/5 p-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{r.toolName}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${actionStyles[r.action]}`}
                    >
                      {r.action}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-white/50">{r.rationale}</div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-accent">
                    ${r.monthlySavings}/mo
                  </div>
                  <div className="text-[11px] text-white/40 tabular-nums">
                    ${r.annualSavings.toLocaleString()}/yr
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {status === "approved" ? (
                    <span className="flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
                      <Check className="h-3.5 w-3.5" /> Approved
                    </span>
                  ) : status === "dismissed" ? (
                    <button
                      onClick={() => setState((s) => ({ ...s, [r.id]: "pending" }))}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                    >
                      Restore
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setState((s) => ({ ...s, [r.id]: "approved" }))}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:bg-accent/90"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setState((s) => ({ ...s, [r.id]: "dismissed" }))}
                        className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 hover:bg-white/10"
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
