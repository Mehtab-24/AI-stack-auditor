import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { findings, tools, type FindingType, type Confidence } from "@/lib/mockData";

const typeStyles: Record<FindingType, string> = {
  Duplicate: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  Underused: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  "Overpriced Tier": "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/20",
  "Inactive Seats": "bg-sky-500/15 text-sky-300 border-sky-500/20",
  "Hidden Add-on": "bg-violet-500/15 text-violet-300 border-violet-500/20",
  "Renewal Risk": "bg-orange-500/15 text-orange-300 border-orange-500/20",
};

const confStyles: Record<Confidence, string> = {
  High: "bg-accent/15 text-accent border-accent/30",
  Medium: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  Low: "bg-white/10 text-white/60 border-white/15",
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

export function FindingsView() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "All" ? findings : findings.filter((f) => f.type === filter)),
    [filter],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div>
        <h2 className="text-2xl font-semibold text-white">Findings</h2>
        <p className="text-sm text-white/50">
          {findings.length} issues detected across your AI stack
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              filter === f
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visible.map((f) => {
          const tool = tools.find((t) => t.id === f.toolId)!;
          const isOpen = expanded === f.id;
          return (
            <motion.div
              key={f.id}
              layout
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm hover:shadow-lg hover:shadow-black/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white">{tool.name}</div>
                  <div className="text-xs text-white/50">{tool.vendor}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/40">Monthly</div>
                  <div className="text-sm font-medium tabular-nums text-white/80 line-through decoration-rose-400/60">
                    ${tool.monthlyCost}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${typeStyles[f.type]}`}
                >
                  {f.type}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${confStyles[f.confidence]}`}
                >
                  {f.confidence} confidence
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60 tabular-nums">
                  Save ${f.monthlySavings}/mo
                </span>
              </div>

              <button
                onClick={() => setExpanded(isOpen ? null : f.id)}
                className="mt-4 flex w-full items-center justify-between text-left text-xs text-white/50 hover:text-white/80"
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
                    <div className="mt-3 space-y-2 rounded-lg border border-white/5 bg-black/30 p-3 text-xs text-white/70">
                      <div>
                        <span className="text-white/40">Detected by: </span>
                        <span className="text-white">{f.agent}</span>
                      </div>
                      <div>{f.reasoning}</div>
                      {f.suggestedAlternative && (
                        <div className="rounded-md border border-accent/20 bg-accent/5 p-2 text-accent">
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
