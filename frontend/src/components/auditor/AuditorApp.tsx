import { useState, useEffect, useRef } from "react";
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
import { Sun, Moon, LogOut, Sparkles, Database } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Transform the backend's snake_case API response to the camelCase shape that
// all dashboard / findings / recommendations components expect.
// MyReportsPage does the same mapping when loading from Supabase — keep in sync.
// ---------------------------------------------------------------------------
function confidenceLabel(score: number): string {
  if (score >= 0.75) return "High";
  if (score >= 0.45) return "Medium";
  return "Low";
}

function transformAuditResponse(apiData: any): any {
  const report = apiData?.report ?? apiData;

  const tools = (report.tools ?? []).map((t: any) => ({
    id: t.id,
    name: t.tool_name,
    tool_name: t.tool_name,
    vendor: t.vendor,
    category: t.category,
    monthlyCost: t.monthly_cost ?? 0,
    monthly_cost: t.monthly_cost ?? 0,
    seats: t.seats_purchased ?? 1,
    seats_purchased: t.seats_purchased ?? 1,
    activeSeats: t.seats_active_estimated ?? t.seats_purchased ?? 1,
    seats_active_estimated: t.seats_active_estimated,
    flagged: false, // derived below
    plan_tier: t.plan_tier,
    is_ai_addon: t.is_ai_addon,
    source: t.source,
    renewal_date: t.renewal_date,
  }));

  const findings = (report.findings ?? []).map((f: any) => ({
    id: f.id,
    toolId: f.tool_id,
    tool_id: f.tool_id,
    type: f.finding_type
      ? f.finding_type.charAt(0).toUpperCase() + f.finding_type.slice(1).replace(/_/g, " ")
      : "Unknown",
    finding_type: f.finding_type,
    confidence: confidenceLabel(f.confidence_score ?? 0),
    confidence_score: f.confidence_score,
    agent: f.generated_by_agent,
    generated_by_agent: f.generated_by_agent,
    reasoning: f.description,
    description: f.description,
    suggestedAlternative: f.suggested_alternative ?? "",
    suggested_alternative: f.suggested_alternative,
    monthlySavings: f.estimated_monthly_savings ?? 0,
    estimated_monthly_savings: f.estimated_monthly_savings ?? 0,
  }));

  // Mark tools that appear in findings as flagged
  const flaggedIds = new Set(findings.map((f: any) => f.toolId).filter(Boolean));
  for (const t of tools) {
    if (flaggedIds.has(t.id)) t.flagged = true;
  }

  const recommendations = (report.recommendations ?? []).map((r: any) => ({
    id: r.id,
    findingId: r.finding_id,
    finding_id: r.finding_id,
    toolName: r.tool_name ?? "",
    tool_name: r.tool_name,
    action: r.action_type
      ? r.action_type.charAt(0).toUpperCase() + r.action_type.slice(1)
      : "Review",
    action_type: r.action_type,
    rationale: r.suggested_alternative ?? r.rationale ?? "",
    suggested_alternative: r.suggested_alternative,
    monthlySavings: r.estimated_monthly_savings ?? 0,
    estimated_monthly_savings: r.estimated_monthly_savings ?? 0,
    annualSavings: r.estimated_annual_savings ?? 0,
    estimated_annual_savings: r.estimated_annual_savings ?? 0,
    status: r.status,
  }));

  // Map agent_trace to the shape AgentTracePanel expects: {agent, running, result}
  const agentTraceSteps = (report.agent_trace ?? []).map((step: any) => ({
    agent: step.agent,
    label: step.agent,
    running: `${step.agent} running...`,
    result: step.summary || `${step.agent} completed`,
    duration_ms: step.duration_ms,
    status: step.status,
  }));

  return {
    // top-level flat shape (what components read directly from auditResult)
    tools,
    findings,
    recommendations,
    roi_scores: report.roi_scores ?? [],
    agentTraceSteps,
    // report sub-object for summary stats
    report: {
      id: report.id,
      generated_at: report.generated_at,
      totalMonthlySavings: report.total_monthly_savings ?? 0,
      totalAnnualSavings: report.total_annual_savings ?? 0,
      totalToolsDiscovered: report.tools_discovered ?? tools.length,
      totalToolsFlagged: report.tools_flagged ?? findings.length,
      total_monthly_savings: report.total_monthly_savings ?? 0,
      total_annual_savings: report.total_annual_savings ?? 0,
    },
    // convenience top-level aliases some components use
    totalMonthlySavings: report.total_monthly_savings ?? 0,
    totalAnnualSavings: report.total_annual_savings ?? 0,
    toolsDiscovered: report.tools_discovered ?? tools.length,
    toolsFlagged: report.tools_flagged ?? findings.length,
    persisted: apiData?.persisted ?? false,
  };
}

type Stage = "reports" | "upload" | "trace" | "app";
type Tab = "dashboard" | "findings" | "recommendations" | "simulator";

const tabs: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "findings", label: "Findings" },
  { id: "recommendations", label: "Recommendations" },
  { id: "simulator", label: "Simulator" },
];

const FUNKY_COLORS = [
  "#D4B4FF", // Neon Purple
  "#FFAEF5", // Neon Pink
  "#FFB69B", // Funky Coral
  "#FFF29B", // Funky Gold
  "#9BFAFF", // Neon Cyan
  "#9BFFEB", // Turquoise Mint
  "#FF9BAC", // Neon Rose
  "#A6B4FC", // Periwinkle
];

export function AuditorApp() {
  const [stage, setStage] = useState<Stage>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("auditor_stage");
      if (saved) return saved as Stage;
    }
    return "upload";
  });
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("auditor_tab");
      if (saved) return saved as Tab;
    }
    return "dashboard";
  });
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [isDemo, setIsDemo] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("auditor_is_demo") === "true";
    }
    return false;
  });
  const [isDark, setIsDark] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [profileColor, setProfileColor] = useState("#D4B4FF");

  // Custom auth modal and navigation prompts
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  // Backend audit state
  const [auditResult, setAuditResult] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("auditor_result");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Sync state variables to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("auditor_stage", stage);
    }
  }, [stage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("auditor_tab", tab);
    }
  }, [tab]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("auditor_is_demo", String(isDemo));
    }
  }, [isDemo]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (auditResult) {
        sessionStorage.setItem("auditor_result", JSON.stringify(auditResult));
      } else {
        sessionStorage.removeItem("auditor_result");
      }
    }
  }, [auditResult]);

  // Pick random funky profile color on mount
  useEffect(() => {
    const randomColor = FUNKY_COLORS[Math.floor(Math.random() * FUNKY_COLORS.length)];
    setProfileColor(randomColor);
  }, []);

  // Read dark mode state on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  // Handle redirect from password reset
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auth") === "signin") {
        setShowAuthScreen(true);
        toast.success("Password updated — please sign in");
        // Clear search params
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  // Fetch session and set listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      sessionRef.current = session;
      if (session) {
        if (typeof window !== "undefined" && !sessionStorage.getItem("auditor_stage")) {
          setStage("upload");
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        sessionRef.current = null;
        setIsDemo(false);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auditor_stage");
          sessionStorage.removeItem("auditor_tab");
          sessionStorage.removeItem("auditor_result");
          sessionStorage.removeItem("auditor_is_demo");
        }
        setStage("upload");
        setTab("dashboard");
        setAuditResult(null);
        return;
      }

      const wasLoggedOut = !sessionRef.current;
      setSession(newSession);
      sessionRef.current = newSession;

      if (newSession) {
        setIsDemo(false);
        setShowAuthScreen(false);
        setPendingFile((file) => {
          if (file) {
            triggerAuditRun(file, false);
            return null;
          } else {
            if (wasLoggedOut) {
              setStage("upload");
            }
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
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out exception:", e);
    }
    setIsDemo(false);
    setAuditResult(null);
    setStage("upload");
    setTab("dashboard");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("auditor_stage");
      sessionStorage.removeItem("auditor_tab");
      sessionStorage.removeItem("auditor_result");
      sessionStorage.removeItem("auditor_is_demo");
    }
  };

  // Triggers the FastAPI multi-agent backend API call
  const triggerAuditRun = async (file: File | null, useDemo: boolean) => {
    setStage("trace");
    setLoadingAudit(true);
    setAuditResult(null);

    try {
      const formData = new FormData();
      formData.append("use_demo", useDemo ? "true" : "false");
      formData.append("business_name", session ? (session.user.email ?? "user").split("@")[0] : "My Startup");

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

      const raw = await response.json();
      // Transform snake_case backend response → camelCase shape components expect
      const data = transformAuditResponse(raw);
      setAuditResult(data);
      if (data.persisted) {
        toast.success("Audit report saved to your account");
      }
    } catch (error: any) {
      console.warn("FastAPI audit execution failed, resolving on local mock fallback data:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Audit failed — showing demo data (${errMsg})`);
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
                <div className="profile-tab-border" style={{ backgroundColor: profileColor }}>
                  <button
                    onClick={() => setShowSignOut(!showSignOut)}
                    className="profile-tab-content px-3.5 py-1.5 transition cursor-pointer flex items-center gap-2 text-xs font-semibold text-black"
                    style={{
                      fontFamily: "'Product Sans', sans-serif",
                      fontWeight: 400,
                      backgroundColor: profileColor,
                    }}
                  >
                    <span className="text-sm select-none">👤</span>
                    <span className="max-w-[120px] truncate">
                      {session.user.user_metadata?.full_name || session.user.email?.split("@")[0]}
                    </span>
                  </button>
                </div>
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
                <div className="nav-tab-border">
                  <button
                    onClick={() => {
                      setIsDemo(false);
                      setStage("upload");
                      setShowAuthScreen(true);
                    }}
                    className="nav-tab-content px-4 py-1.5 transition cursor-pointer nav-tab-active"
                    style={{
                      fontFamily: "'Product Sans', sans-serif",
                      fontWeight: 400,
                      fontSize: "14px",
                    }}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            ) : (
              <div className="nav-tab-border">
                <button
                  onClick={() => setShowAuthScreen(true)}
                  className="nav-tab-content px-4 py-1.5 transition cursor-pointer nav-tab-active"
                  style={{
                    fontFamily: "'Product Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: "14px",
                  }}
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Logged in routing controls */}
            {session && (
              <>
                {(stage === "app" || stage === "upload") && (
                  <div className="nav-tab-border">
                    <button
                      onClick={() => {
                        setStage("reports");
                        setTab("dashboard");
                      }}
                      className="nav-tab-content px-4 py-1.5 transition cursor-pointer nav-tab-active flex items-center gap-1.5"
                      style={{
                        fontFamily: "'Product Sans', sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
                      }}
                    >
                      <Database className="h-3.5 w-3.5 text-black" /> Audit History
                    </button>
                  </div>
                )}
                {(stage === "reports" || stage === "app") && (
                  <div className="nav-tab-border">
                    <button
                      onClick={() => {
                        setStage("upload");
                      }}
                      className="nav-tab-content px-4 py-1.5 transition cursor-pointer nav-tab-active"
                      style={{
                        fontFamily: "'Product Sans', sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
                      }}
                    >
                      New Audit
                    </button>
                  </div>
                )}
                {(stage === "reports" || stage === "upload") && auditResult && (
                  <div className="nav-tab-border">
                    <button
                      onClick={() => {
                        setStage("app");
                      }}
                      className="nav-tab-content px-4 py-1.5 transition cursor-pointer nav-tab-active"
                      style={{
                        fontFamily: "'Product Sans', sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
                      }}
                    >
                      View Analysis
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Anonymous / Demo routing controls */}
            {!session && (
              <>
                {stage === "app" && (
                  <div className="nav-tab-border">
                    <button
                      onClick={() => {
                        setStage("upload");
                        setTab("dashboard");
                      }}
                      className="nav-tab-content px-4 py-1.5 transition cursor-pointer nav-tab-active"
                      style={{
                        fontFamily: "'Product Sans', sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
                      }}
                    >
                      New Audit
                    </button>
                  </div>
                )}
                {stage === "upload" && auditResult && (
                  <div className="nav-tab-border">
                    <button
                      onClick={() => {
                        setStage("app");
                      }}
                      className="nav-tab-content px-4 py-1.5 transition cursor-pointer nav-tab-active"
                      style={{
                        fontFamily: "'Product Sans', sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
                      }}
                    >
                      View Analysis
                    </button>
                  </div>
                )}
              </>
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
                  To upload custom invoice exports and scan your stack, you must be signed in to
                  your account. Guest users can only view demo audits.
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
