import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertCircle } from "lucide-react";
import { findings as mockFindings, tools as mockTools, type FindingType, type Confidence } from "@/lib/mockData";

const typeStyles: Record<FindingType, string> = {
  Duplicate: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
  Underused: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  "Overpriced Tier": "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/25",
  "Inactive Seats": "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
  "Hidden Add-on": "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25",
  "Renewal Risk": "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25",
};

const confStyles: Record<Confidence, string> = {
  High: "bg-accent/10 text-primary dark:text-accent border-accent/30",
  Medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  Low: "bg-muted text-muted-foreground border-border",
};

const filters: (FindingType | "All")[] = [
  "All",
  "Duplicate",
  "Underused",
  "Overpriced Tier",
  "Inactive Seats",
  "Hidden Add-on",
  "Renewal Risk",
];

interface FindingsViewProps {
  auditResult?: any;
}

export function FindingsView({ auditResult }: FindingsViewProps) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const activeFindings = auditResult?.findings ?? mockFindings;
  const activeTools = auditResult?.tools ?? mockTools;

  const visible = useMemo(
    () => (filter === "All" ? activeFindings : activeFindings.filter((f: any) => f.type === filter)),
    [filter, activeFindings],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-8 py-10">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Findings</h2>
        <p className="text-sm text-muted-foreground">
          {activeFindings.length} subscription issues detected across your AI stack
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              filter === f
                ? "border-accent bg-accent/10 text-primary dark:text-accent"
                : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visible.map((f: any) => {
          const tool = activeTools.find((t: any) => t.id === f.toolId)!;
          const isOpen = expanded === f.id;
          return (
            <motion.div
              key={f.id}
              layout
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{tool?.name || "AI Subscription"}</div>
                  <div className="text-xs text-muted-foreground">{tool?.vendor || "Vendor"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground/60">Monthly</div>
                  <div className="text-sm font-semibold tabular-nums text-muted-foreground/80 line-through decoration-rose-500/60">
                    ${tool?.monthlyCost || 0}
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${typeStyles[f.type as FindingType] || "bg-muted text-muted-foreground"}`}
                >
                  {f.type}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${confStyles[f.confidence as Confidence] || "bg-muted text-muted-foreground"}`}
                >
                  {f.confidence} Confidence
                </span>
                <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
                  Save ${f.monthlySavings}/mo
                </span>
              </div>

              <button
                onClick={() => setExpanded(isOpen ? null : f.id)}
                className="mt-5 flex w-full items-center justify-between text-left text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <span>{isOpen ? "Hide reasoning" : "Why was this flagged?"}</span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-2.5 rounded-2xl border border-border bg-muted/20 p-4 text-xs text-foreground/80 leading-relaxed shadow-inner">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="text-muted-foreground font-semibold">Detected by: </span>
                        <span className="text-foreground font-medium">{f.agent}</span>
                      </div>
                      <div>{f.reasoning}</div>
                      {f.suggestedAlternative && (
                        <div className="rounded-xl border border-accent/25 bg-accent/5 p-3 text-primary dark:text-accent font-medium mt-1">
                          Suggestion: {f.suggestedAlternative}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
