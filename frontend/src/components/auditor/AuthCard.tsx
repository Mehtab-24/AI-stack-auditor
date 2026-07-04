import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, User, Eye, EyeOff, Sparkles, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface AuthCardProps {
  onAuthSuccess: () => void;
  onTryDemo: () => void;
  onCancel?: () => void;
}

export function AuthCard({ onAuthSuccess, onTryDemo, onCancel }: AuthCardProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return "";
    if (pass.length < 8) return "Too Short (Min 8 chars)";
    let score = 0;
    if (/[a-z]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    
    if (score <= 2) return "Weak";
    if (score === 3) return "Medium";
    return "Strong";
  };

  const strengthColor = (strength: string) => {
    switch (strength) {
      case "Weak":
        return "text-rose-500";
      case "Medium":
        return "text-amber-500";
      case "Strong":
        return "text-emerald-500";
      default:
        return "text-muted-foreground";
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Client-side email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Create the default business entry named after user's name
          const { error: businessError } = await supabase.from("businesses").insert({
            user_id: data.user.id,
            name: `${fullName}'s Organization`,
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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Client-side email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // Standard security practice: Do not reveal whether the email exists. Always show success.
      if (resetError) {
        // Log locally, but show generic success to the user
        console.warn("Reset email returned error:", resetError);
      }
      
      setSuccessMessage("Check your email for a reset link.");
      setEmail("");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError("An error occurred while sending the reset link. Please try again.");
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
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-2xl backdrop-blur-md relative"
      >
        {onCancel && (
          <button
            onClick={onCancel}
            className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition"
          >
            ← Back to Upload
          </button>
        )}
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-black shadow-lg shadow-accent/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            {isForgotPassword 
              ? "Reset Password" 
              : isSignUp 
                ? "Create Account" 
                : "Welcome Back"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isForgotPassword
              ? "We'll email you a link to reset your password"
              : isSignUp
                ? "Start auditing your AI stack and find wasted spend"
                : "Sign in to access your audit reports"}
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
            <div className="font-medium leading-relaxed">{successMessage}</div>
          </motion.div>
        )}

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

        {isForgotPassword ? (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-2xl bg-accent py-3 text-sm font-semibold text-black shadow-lg shadow-accent/20 transition hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-medium text-accent hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* SIGN IN / SIGN UP FORM */
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold text-muted-foreground">
                  Full Name
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
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
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground/50 hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!isSignUp && (
                <div className="mt-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-accent hover:underline font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
              {isSignUp && password && (
                <div className="mt-1.5 flex justify-between text-[10px] font-semibold">
                  <span className="text-muted-foreground">Password strength:</span>
                  <span className={strengthColor(getPasswordStrength(password))}>
                    {getPasswordStrength(password)}
                  </span>
                </div>
              )}
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-muted-foreground">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="block w-full rounded-2xl border border-border bg-muted/20 py-2.5 pl-10 pr-10 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition focus:border-accent focus:bg-background focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground/50 hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isSignUp && confirmPassword && password !== confirmPassword && (
                  <div className="mt-1 text-[10px] font-semibold text-rose-500">
                    Passwords do not match.
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-2xl bg-accent py-3 text-sm font-semibold text-black shadow-lg shadow-accent/20 transition hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
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
        )}

        {!isForgotPassword && (
          <>
            {!isSignUp && (
              <>
                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-x-0 h-px bg-border" />
                  <span className="relative bg-card px-3 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    or
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onTryDemo}
                  className="flex w-full items-center justify-center rounded-2xl border border-border bg-transparent py-3 text-sm font-semibold text-foreground transition hover:bg-muted/40 shadow-sm hover:border-accent/40 cursor-pointer"
                >
                  Try Demo (no account) →
                </button>
              </>
            )}

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccessMessage(null);
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isSignUp ? (
                  <>
                    Already have an account? <span className="text-accent underline">Sign in</span>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account? <span className="text-accent underline">Register</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
