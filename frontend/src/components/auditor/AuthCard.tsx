import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, Building, Eye, EyeOff, Sparkles, Loader2, AlertCircle } from "lucide-react";

interface AuthCardProps {
  onAuthSuccess: () => void;
  onTryDemo: () => void;
}

export function AuthCard({ onAuthSuccess, onTryDemo }: AuthCardProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (!companyName.trim()) {
          throw new Error("Please enter your company name.");
        }

        // Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Create the default business entry
          const { error: businessError } = await supabase.from("businesses").insert({
            user_id: data.user.id,
            name: companyName,
          });

          if (businessError) throw businessError;
        }

        onAuthSuccess();
      } else {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[90vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-2xl backdrop-blur-md"
      >
        {/* Logo and Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-black shadow-lg shadow-accent/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignUp
              ? "Start auditing your AI stack and find wasted spend"
              : "Sign in to access your audit reports"}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`rounded-full py-2 text-xs font-semibold transition ${
              !isSignUp
                ? "bg-accent text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`rounded-full py-2 text-xs font-semibold transition ${
              isSignUp
                ? "bg-accent text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive-foreground"
          >
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-destructive" />
            <div className="font-medium leading-relaxed">{error}</div>
          </motion.div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label htmlFor="company" className="block text-xs font-semibold text-muted-foreground">
                Company Name
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60">
                  <Building className="h-4 w-4" />
                </span>
                <input
                  id="company"
                  type="text"
                  required
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                  className="block w-full rounded-2xl border border-border bg-muted/20 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition focus:border-accent focus:bg-background focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-muted-foreground">
              Email Address
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60">
                <Mail className="h-4 w-4" />
              </span>
              <input
                id="email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="block w-full rounded-2xl border border-border bg-muted/20 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition focus:border-accent focus:bg-background focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-muted-foreground">
              Password
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="block w-full rounded-2xl border border-border bg-muted/20 py-2.5 pl-10 pr-10 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition focus:border-accent focus:bg-background focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground/50 hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-accent py-3 text-sm font-semibold text-black shadow-lg shadow-accent/20 transition hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-x-0 h-px bg-border" />
          <span className="relative bg-card px-3 text-[10px] uppercase tracking-wider text-muted-foreground/60">
            or
          </span>
        </div>

        <button
          type="button"
          onClick={onTryDemo}
          className="flex w-full items-center justify-center rounded-2xl border border-border bg-muted/20 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/40"
        >
          Try Demo (no account) →
        </button>
      </motion.div>
    </div>
  );
}
