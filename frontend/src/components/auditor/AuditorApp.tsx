import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { AuthCard } from "./AuthCard";
import { UploadPanel } from "./UploadPanel";
import { AgentTracePanel } from "./AgentTracePanel";
import { SavingsDashboard } from "./SavingsDashboard";
import { FindingsView } from "./FindingsView";
import { RecommendationsView } from "./RecommendationsView";
import { Sun, Moon, LogOut, User, Sparkles } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

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
  const [session, setSession] = useState<Session | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  
  // Backend audit state
  const [auditResult, setAuditResult] = useState<any>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Read dark mode state on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  // Fetch session and set listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setIsDemo(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      localStorage.theme = "light";
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.theme = "dark";
      setIsDark(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsDemo(false);
    setAuditResult(null);
    setStage("upload");
    setTab("dashboard");
  };

  // Triggers the FastAPI multi-agent backend API call
  const triggerAuditRun = async (file: File | null, useDemo: boolean) => {
    setStage("trace");
    setLoadingAudit(true);
    setAuditResult(null);

    try {
      const formData = new FormData();
      formData.append("use_demo", useDemo ? "true" : "false");
      formData.append("business_name", session ? session.user.email.split("@")[0] : "My Startup");

      if (session) {
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (business) {
          formData.append("business_id", business.id);
        }
      }

      if (file) {
        formData.append("file", file);
      }

      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/audit/run`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setAuditResult(data);
    } catch (error) {
      console.warn("FastAPI audit execution failed, resolving on local mock fallback data:", error);
      // The individual widgets will naturally resolve to mockData if auditResult is null
    } finally {
      setLoadingAudit(false);
    }
  };

  // If not authenticated and not in demo mode, show AuthCard
  if (!session && !isDemo) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
                <span className="text-xs font-bold">A</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">AI Stack Auditor</span>
            </div>
            <button
              onClick={toggleTheme}
              className="rounded-full border border-border bg-card p-2 text-muted-foreground transition hover:text-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>
        <AuthCard
          onAuthSuccess={() => setIsDemo(false)}
          onTryDemo={() => setIsDemo(true)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
              <span className="text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">AI Stack Auditor</span>
          </div>

          {stage === "app" && (
            <nav className="flex items-center gap-1 rounded-full border border-border bg-muted/30 p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    tab === t.id ? "text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === t.id && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className={`relative ${tab === t.id ? "text-black dark:text-black font-semibold" : ""}`}>{t.label}</span>
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-full border border-border bg-card p-1.5 text-muted-foreground transition hover:text-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Auth / Profile details */}
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setShowSignOut(!showSignOut)}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">{session.user.email}</span>
                </button>
                <AnimatePresence>
                  {showSignOut && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowSignOut(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute right-0 mt-2 z-40 w-44 rounded-2xl border border-border bg-card p-1 shadow-xl"
                      >
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-3 w-3" /> Demo Mode
                </span>
                <button
                  onClick={() => setIsDemo(false)}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:bg-accent/90"
                >
                  Create Account
                </button>
              </div>
            )}

            {stage === "app" && (
              <button
                onClick={() => {
                  setStage("upload");
                  setTab("dashboard");
                  setAuditResult(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5"
              >
                New audit
              </button>
            )}
          </div>
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
            <UploadPanel onAnalyze={triggerAuditRun} />
          </motion.div>
        )}

        {stage === "trace" && (
          <motion.div
            key="trace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AgentTracePanel 
              steps={auditResult?.agentTraceSteps}
              onComplete={() => setTimeout(() => setStage("app"), 700)} 
            />
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
            {tab === "dashboard" && <SavingsDashboard auditResult={auditResult} />}
            {tab === "findings" && <FindingsView auditResult={auditResult} />}
            {tab === "recommendations" && <RecommendationsView auditResult={auditResult} />}
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
