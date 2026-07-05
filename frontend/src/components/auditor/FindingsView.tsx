import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertCircle } from "lucide-react";
import {
  findings as mockFindings,
  tools as mockTools,
  type FindingType,
  type Confidence,
} from "@/lib/mockData";

const typeStyles: Record<FindingType, string> = {
  Duplicate: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
  Underused: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  "Overpriced Tier":
    "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/25",
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
    () =>
      filter === "All" ? activeFindings : activeFindings.filter((f: any) => f.type === filter),
    [filter, activeFindings],
  );

  return (
    <div className="mx-auto max-w-[1400px] py-10 space-y-6">
      {/* Title & Subtitle */}
      <div className="md:px-[111px] px-8 w-full space-y-2">
        <h2
          className="text-[#1E1E1E] dark:text-[#FFFFFF] text-[30px]"
          style={{
            fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
            fontWeight: 500,
            lineHeight: "100%",
            letterSpacing: "0%",
          }}
        >
          Findings
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
          {activeFindings.length} subscription issues detected across your AI stack
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="md:px-[111px] px-8 w-full flex flex-wrap gap-2">
        {filters.map((f) => {
          const isActive = filter === f;
          return (
            <div key={f} className="nav-tab-border">
              <button
                onClick={() => setFilter(f)}
                className={`nav-tab-content px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  isActive ? "nav-tab-active" : "nav-tab-inactive"
                }`}
              >
                {f}
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-x-[111px] md:px-[111px] max-w-[1400px] mx-auto w-full">
        {visible.map((f: any) => {
          const tool = activeTools.find((t: any) => t.id === f.toolId)!;
          const isOpen = expanded === f.id;
          return (
            <motion.div
              key={f.id}
              layout
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="cut-br-border dashboard-box-border w-full max-w-[533px] min-h-[139px] flex flex-col"
            >
              <div className="cut-br-content dashboard-box-content pt-5 pb-5 pr-5 pl-[42px] h-full flex flex-col justify-between flex-1">
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div>
                    <div
                      className="text-[#1E1E1E] dark:text-[#FFFFFF]"
                      style={{
                        fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
                        fontWeight: 500,
                        fontSize: "16px",
                        lineHeight: "100%",
                        letterSpacing: "0%",
                      }}
                    >
                      {tool?.name || "AI Subscription"}
                    </div>
                    <div
                      className="text-[#B8B8B8]"
                      style={{
                        fontFamily: "'Product Sans', sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        lineHeight: "100%",
                        letterSpacing: "0%",
                        marginTop: "6px",
                      }}
                    >
                      {tool?.vendor || "Vendor"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-[#1E1E1E] dark:text-[#FFFFFF]"
                      style={{
                        fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
                        fontWeight: 500,
                        fontSize: "14px",
                        lineHeight: "100%",
                        letterSpacing: "0%",
                      }}
                    >
                      MONTHLY
                    </div>
                    <div
                      className="text-[#B8B8B8]"
                      style={{
                        fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
                        fontWeight: 500,
                        fontSize: "16px",
                        lineHeight: "100%",
                        letterSpacing: "0%",
                        textDecoration: "line-through",
                        marginTop: "6px",
                      }}
                    >
                      ${tool?.monthlyCost || 0}
                    </div>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="mt-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Finding Type Button */}
                    <div
                      className="flex items-center justify-center text-center select-none text-[#505A18]"
                      style={{
                        width: "106px",
                        height: "22px",
                        background: "#F6FFCA",
                        clipPath: "polygon(0 0, 100px 0, 106px 6px, 106px 22px, 6px 22px, 0 16px)",
                        fontFamily: "'Product Sans', sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        lineHeight: "100%",
                      }}
                    >
                      {f.type}
                    </div>

                    {/* Confidence Button */}
                    <div
                      className="flex items-center justify-center text-center select-none text-[#1C542B]"
                      style={{
                        width: "106px",
                        height: "22px",
                        background: "#BAFFC4",
                        clipPath: "polygon(0 0, 100px 0, 106px 6px, 106px 22px, 6px 22px, 0 16px)",
                        fontFamily: "'Product Sans', sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        lineHeight: "100%",
                      }}
                    >
                      {f.confidence} Confidence
                    </div>

                    {/* Savings Button */}
                    <div
                      className="flex items-center justify-center text-center select-none text-[#1C4E54]"
                      style={{
                        width: "106px",
                        height: "22px",
                        background: "#BAF6FF",
                        clipPath: "polygon(0 0, 100px 0, 106px 6px, 106px 22px, 6px 22px, 0 16px)",
                        fontFamily: "'Product Sans', sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        lineHeight: "100%",
                      }}
                    >
                      Save ${f.monthlySavings}/mo
                    </div>
                  </div>

                  <button
                    onClick={() => setExpanded(isOpen ? null : f.id)}
                    className="flex items-center gap-1 text-[#B8B8B8] hover:text-foreground/80 transition-colors"
                    style={{
                      fontFamily: "'Product Sans', sans-serif",
                      fontWeight: 400,
                      fontSize: "12px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                    }}
                  >
                    <span>{isOpen ? "Hide reasoning" : "Why was this flagged?"}</span>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                      <ChevronDown className="h-3 w-3" />
                    </motion.span>
                  </button>
                </div>

                {/* Reasoning Panel */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-2.5 rounded-xl border border-border/40 bg-muted/10 p-4 text-xs text-foreground/80 leading-relaxed shadow-inner">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                          <span className="text-muted-foreground font-semibold">Detected by: </span>
                          <span className="text-foreground font-medium">{f.agent}</span>
                        </div>
                        <div>{f.reasoning}</div>
                        {f.suggestedAlternative && (
                          <div className="rounded-lg border border-accent/25 bg-accent/5 p-3 text-primary dark:text-accent font-medium mt-1">
                            Suggestion: {f.suggestedAlternative}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
