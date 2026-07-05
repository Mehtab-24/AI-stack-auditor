import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Tags,
  AlertTriangle,
  Sparkles,
  FileCheck,
  Play,
  Check,
  ChevronDown,
} from "lucide-react";
import { agentTraceSteps } from "@/lib/mockData";

const icons = [Search, Tags, AlertTriangle, Sparkles, FileCheck, Play, Check];

export function AgentTracePanel({
  onComplete,
  compact = false,
  noBorder = false,
  steps,
}: {
  onComplete?: () => void;
  compact?: boolean;
  noBorder?: boolean;
  steps?: any[];
}) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(!compact);
  const activeSteps = steps || agentTraceSteps;

  useEffect(() => {
    if (active >= activeSteps.length) {
      onComplete?.();
      return;
    }
    const t = setTimeout(() => setActive((a) => a + 1), 900);
    return () => clearTimeout(t);
  }, [active, onComplete, activeSteps]);

  const done = active >= activeSteps.length;

  const getStepBg = (isStepDone: boolean, isStepActive: boolean) => {
    if (isStepDone) return "#BAFFC4";
    if (isStepActive) return "#BAF6FF";
    return "#F6FFCA";
  };

  const getStepText = (isStepDone: boolean, isStepActive: boolean) => {
    if (isStepDone) return "#1C542B";
    if (isStepActive) return "#1C4E54";
    return "#505A18";
  };

  return (
    <div
      className={
        compact
          ? noBorder
            ? "w-full bg-transparent"
            : "rounded-2xl border border-border bg-card p-5 shadow-sm"
          : "mx-auto max-w-[1400px] py-16 space-y-8 w-full"
      }
    >
      {compact && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="mb-3 flex w-full items-center justify-between text-left pl-2 pr-2"
        >
          <div>
            <div className="dashboard-box-heading">Agent Trace</div>
            <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
              Tracing progress — 7 specialized agents, {activeSteps.length} steps
            </div>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>
      )}

      {!compact && (
        <section className="w-full flex flex-col items-center text-center gap-4 border-b border-border pb-6">
          <div className="space-y-2 max-w-2xl mx-auto">
            <p
              className="text-[#B8B8B8] dark:text-[#828282] text-[18px]"
              style={{
                fontFamily: "'Product Sans', sans-serif",
                fontWeight: 400,
                lineHeight: "100%",
                letterSpacing: "0%",
              }}
            >
              Running Audit
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
              Agents at work
            </h2>
            <p
              className="text-[#B8B8B8] mt-2 text-sm max-w-2xl leading-relaxed mx-auto"
              style={{
                fontFamily: "'Product Sans', sans-serif",
                fontWeight: 400,
              }}
            >
              A multi-agent reasoning chain is parsing, categorizing, and checking your stack for
              leaks.
            </p>
          </div>
        </section>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            initial={compact ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={
              compact
                ? "relative space-y-3 overflow-hidden pl-2 pr-2"
                : "mx-auto max-w-2xl w-full relative space-y-3 overflow-hidden px-4"
            }
          >
            {activeSteps.map((step, i) => {
              const Icon = icons[i] || Sparkles;
              const isDone = i < active || done;
              const isActive = i === active && !done;
              const isPending = i > active && !done;
              return (
                <motion.li
                  key={step.agent}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{
                    opacity: isPending ? 0.35 : 1,
                    x: 0,
                  }}
                  transition={{ duration: 0.4, delay: compact ? 0 : i * 0.05 }}
                  className="relative flex gap-4 rounded-2xl border border-border bg-muted/20 p-4 shadow-sm"
                >
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                    <Icon className="h-4 w-4 text-foreground/80" />
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      {isActive && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex h-3 w-3 items-center justify-center rounded-full ${
                          isDone ? "bg-accent" : isActive ? "bg-accent" : "bg-muted-foreground/30"
                        }`}
                      >
                        {isDone && <Check className="h-2 w-2 text-black" strokeWidth={4} />}
                      </span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
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
                        {step.agent}
                      </div>
                      <div
                        className="flex items-center justify-center text-center select-none shrink-0"
                        style={{
                          width: "106px",
                          height: "22px",
                          background: getStepBg(isDone, isActive),
                          color: getStepText(isDone, isActive),
                          clipPath:
                            "polygon(0 0, 100px 0, 106px 6px, 106px 22px, 6px 22px, 0 16px)",
                          fontFamily: "'Product Sans', sans-serif",
                          fontWeight: 400,
                          fontSize: "12px",
                          lineHeight: "100%",
                        }}
                      >
                        Step {i + 1}
                      </div>
                    </div>
                    <div
                      className="text-[#B8B8B8] mt-1.5 leading-relaxed"
                      style={{
                        fontFamily: "'Product Sans', sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        lineHeight: "135%",
                        letterSpacing: "0%",
                      }}
                    >
                      {isDone ? step.result : step.running}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
