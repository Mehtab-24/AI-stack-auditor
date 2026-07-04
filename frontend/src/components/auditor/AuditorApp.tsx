import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { AuthCard } from "./AuthCard";
import { UploadPanel } from "./UploadPanel";
import { AgentTracePanel } from "./AgentTracePanel";
import { SavingsDashboard } from "./SavingsDashboard";
import { FindingsView } from "./FindingsView";
import { RecommendationsView } from "./RecommendationsView";
import { MyReportsPage } from "./MyReportsPage";
import { StackSimulator } from "./StackSimulator";
import { Sun, Moon, LogOut, User, Sparkles, Database } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

type Stage = "reports" | "upload" | "trace" | "app";
type Tab = "dashboard" | "findings" | "recommendations" | "simulator";

const tabs: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "findings", label: "Findings" },
  { id: "recommendations", label: "Recommendations" },
  { id: "simulator", label: "Simulator" },
];

export function AuditorApp() {
  const [stage, setStage] = useState<Stage>("upload");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [session, setSession] = useState<Session | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  
  // Custom auth modal and navigation prompts
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);

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
      if (session) {
        setStage("reports");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setIsDemo(false);
        setShowAuthScreen(false);
        setPendingFile((file) => {
          if (file) {
            triggerAuditRun(file, false);
            return null;
          } else {
            setStage("reports");
            return null;
          }
        });
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
      // Fallback resolves to mockData if auditResult is null
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleAnalyze = (file: File | null, useDemo: boolean) => {
    if (useDemo) {
      setIsDemo(true);
      triggerAuditRun(null, true);
    } else {
      if (!session) {
        setPendingFile(file);
        setShowAuthModal(true);
      } else {
        triggerAuditRun(file, false);
      }
    }
  };

  // If showing auth screen, display AuthCard
  if (showAuthScreen && !session) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
                <span className="text-xs font-bold text-black font-sans">A</span>
              </div>
              <span className="logo-heading">AI Stack Auditor</span>
            </div>
            <button
              onClick={toggleTheme}
              className="rounded-full border border-border bg-card p-2 text-muted-foreground transition hover:text-foreground cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>
        <AuthCard
          onAuthSuccess={() => {
            setShowAuthScreen(false);
            setIsDemo(false);
          }}
          onTryDemo={() => {
            setShowAuthScreen(false);
            setIsDemo(true);
            triggerAuditRun(null, true);
          }}
          onCancel={() => {
            setShowAuthScreen(false);
            setPendingFile(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur w-full">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-8 py-4">
          {/* Left Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
              <span className="text-xs font-bold text-black font-sans">A</span>
            </div>
            <span className="logo-heading">AI Stack Auditor</span>
          </div>

          {/* Center Tabs */}
          {stage === "app" ? (
            <nav className="flex items-center gap-2 justify-center flex-1 mx-4">
              {tabs.map((t) => {
                const isActive = tab === t.id;
                return (
                  <div key={t.id} className="nav-tab-border">
                    <button
                      onClick={() => setTab(t.id)}
                      className={`nav-tab-content px-5 py-2 transition cursor-pointer ${
                        isActive ? "nav-tab-active" : "nav-tab-inactive"
                      }`}
                    >
                      {t.label}
                    </button>
                  </div>
                );
              })}
            </nav>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-3 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-full border border-border bg-card p-1.5 text-muted-foreground transition hover:text-foreground cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Auth / Profile details */}
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setShowSignOut(!showSignOut)}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground cursor-pointer"
                >
                  <span className="text-base select-none">👤</span>
                  <span className="max-w-[120px] truncate font-semibold text-foreground">
                    {session.user.user_metadata?.full_name || session.user.email?.split("@")[0]}
                  </span>
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
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : isDemo ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-3 w-3 fill-amber-500 text-amber-500" /> Demo Mode
                </span>
                <button
                  onClick={() => {
                    setIsDemo(false);
                    setStage("upload");
                    setShowAuthScreen(true);
                  }}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:bg-accent/90 cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthScreen(true)}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black hover:bg-accent/90 cursor-pointer"
              >
                Sign In
              </button>
            )}

            {session && (stage === "app" || stage === "upload") && (
              <button
                onClick={() => {
                  setStage("reports");
                  setTab("dashboard");
                  setAuditResult(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 flex items-center gap-1 bg-card hover:bg-muted/40 cursor-pointer"
              >
                <Database className="h-3 w-3" /> Dashboard
              </button>
            )}

            {!session && stage === "app" && (
              <button
                onClick={() => {
                  setStage("upload");
                  setTab("dashboard");
                  setAuditResult(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 bg-card hover:bg-muted/40 cursor-pointer"
              >
                New audit
              </button>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {stage === "reports" && (
          <motion.div
            key="reports"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MyReportsPage
              session={session}
              onNewAudit={() => setStage("upload")}
              onLoadReport={(reportData) => {
                setAuditResult(reportData);
                setStage("app");
              }}
            />
          </motion.div>
        )}

        {stage === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <UploadPanel onAnalyze={handleAnalyze} />
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
            {tab === "simulator" && <StackSimulator auditResult={auditResult} />}
          </motion.main>
        )}
      </AnimatePresence>

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-black shadow-lg shadow-accent/20">
                  <Database className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Are you signed in?</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  To upload custom invoice exports and scan your stack, you must be signed in to your account. Guest users can only view demo audits.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setShowAuthModal(false);
                      setShowAuthScreen(true);
                    }}
                    className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-black hover:bg-accent/90 cursor-pointer"
                  >
                    Yes, Sign In / Register
                  </button>
                  <button
                    onClick={() => {
                      setShowAuthModal(false);
                      setPendingFile(null);
                    }}
                    className="w-full rounded-xl border border-border bg-muted/20 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground cursor-pointer mt-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
