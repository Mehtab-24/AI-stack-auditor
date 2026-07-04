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

  return (
    <div
      className={
        compact
          ? noBorder
            ? "w-full bg-transparent"
            : "rounded-2xl border border-border bg-card p-5 shadow-sm"
          : "mx-auto max-w-2xl px-6 py-16"
      }
    >
      {compact && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="mb-3 flex w-full items-center justify-between text-left pl-[93px] pr-4"
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
        <div className="mb-8 text-center">
          <div className="text-xs uppercase tracking-widest text-accent font-semibold">Running Audit</div>
          <h2 className="mt-2 text-3xl font-semibold text-foreground">Agents at work</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A multi-agent reasoning chain is parsing, categorizing, and checking your stack for leaks.
          </p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            initial={compact ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative space-y-3 overflow-hidden pl-2 pr-2"
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{step.agent}</span>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold bg-muted px-1.5 py-0.5 rounded">
                        Step {i + 1}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {isDone ? null : step.running}
                    </div>
                    <AnimatePresence>
                      {isDone && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                          className="mt-1 text-xs text-foreground/80 font-medium leading-relaxed"
                        >
                          {step.result}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
