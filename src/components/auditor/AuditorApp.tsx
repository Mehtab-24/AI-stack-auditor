import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadPanel } from "./UploadPanel";
import { AgentTracePanel } from "./AgentTracePanel";
import { SavingsDashboard } from "./SavingsDashboard";
import { FindingsView } from "./FindingsView";
import { RecommendationsView } from "./RecommendationsView";

type Stage = "upload" | "trace" | "app";
type Tab = "dashboard" | "findings" | "recommendations";

const tabs: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "findings", label: "Findings" },
  { id: "recommendations", label: "Recommendations" },
];

export function AuditorApp() {
  const [stage, setStage] = useState<Stage>("upload");
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="min-h-screen bg-background text-white">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-black">
              <span className="text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">AI Stack Auditor</span>
          </div>
          {stage === "app" && (
            <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    tab === t.id ? "text-black" : "text-white/60 hover:text-white"
                  }`}
                >
                  {tab === t.id && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{t.label}</span>
                </button>
              ))}
            </nav>
          )}
          {stage === "app" && (
            <button
              onClick={() => {
                setStage("upload");
                setTab("dashboard");
              }}
              className="text-xs text-white/50 hover:text-white"
            >
              New audit
            </button>
          )}
          {stage !== "app" && <div className="w-16" />}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {stage === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <UploadPanel onAnalyze={() => setStage("trace")} />
          </motion.div>
        )}

        {stage === "trace" && (
          <motion.div
            key="trace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AgentTracePanel onComplete={() => setTimeout(() => setStage("app"), 700)} />
          </motion.div>
        )}

        {stage === "app" && (
          <motion.main
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {tab === "dashboard" && <SavingsDashboard />}
            {tab === "findings" && <FindingsView />}
            {tab === "recommendations" && <RecommendationsView />}
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
