import { useState } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
// @ts-ignore
import { supabase } from "@/lib/supabaseClient";

interface AuthCardProps {
  onAuthSuccess: () => void;
  onTryDemo: () => void;
  onCancel?: () => void;
}

type AuthView = "signin" | "signup" | "forgotpassword";

export function AuthCard({ onAuthSuccess, onTryDemo, onCancel }: AuthCardProps) {
  const [view, setView] = useState<AuthView>("signin");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Error / Success Banners (Supabase or generic)
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Client-side Validation Inline Errors
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

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

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (emailError) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setEmailError(null);
      }
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (passwordError) {
      if (val.length >= 8) {
        setPasswordError(null);
      }
    }
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    if (confirmPasswordError) {
      if (val === password) {
        setConfirmPasswordError(null);
      }
    }
  };

  const handleFullNameChange = (val: string) => {
    setFullName(val);
    if (fullNameError) {
      if (val.trim()) {
        setFullNameError(null);
      }
    }
  };

  // Validates form fields on submit
  const validateForm = () => {
    let isValid = true;

    if (view === "signup") {
      if (!fullName.trim()) {
        setFullNameError("Full name is required.");
        isValid = false;
      } else {
        setFullNameError(null);
      }
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    } else {
      setEmailError(null);
    }

    if (view === "signup") {
      if (password.length < 8) {
        setPasswordError("Password must be at least 8 characters long.");
        isValid = false;
      } else {
        setPasswordError(null);
      }

      if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match.");
        isValid = false;
      } else {
        setConfirmPasswordError(null);
      }
    }

    return isValid;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (view === "signup") {
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
          try {
            // Create the default business entry named after user's name
            const { error: businessError } = await supabase.from("businesses").insert({
              user_id: data.user.id,
              name: `${fullName}'s Organization`,
            });

            if (businessError) {
              console.warn("Could not create default business automatically:", businessError);
            }
          } catch (businessErr) {
            console.error("Failed to insert business record:", businessErr);
          }
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

    // Client-side validation for forgot password view
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    } else {
      setEmailError(null);
    }

    setLoading(true);

    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch (err: any) {
      console.error("Forgot password error:", err);
    } finally {
      // Security standard: Always show the same success message regardless of existence or error
      setSuccessMessage("If an account exists for that email, a reset link is on its way.");
      setEmail("");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || "Could not initialize Google sign-in.");
      setLoading(false);
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setSuccessMessage(null);
    setFullNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
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
          <h2
            className="text-foreground text-[30px]"
            style={{
              fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
              fontWeight: 500,
              lineHeight: "100%",
              letterSpacing: "0%",
            }}
          >
            {view === "forgotpassword"
              ? "Reset Password"
              : view === "signup"
                ? "Create Account"
                : "Welcome Back"}
          </h2>
          <p
            className="mt-3 text-muted-foreground text-[14px] leading-relaxed"
            style={{
              fontFamily: "'Product Sans', sans-serif",
              fontWeight: 400,
              letterSpacing: "0%",
            }}
          >
            {view === "forgotpassword"
              ? "We'll email you a link to reset your password"
              : view === "signup"
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

        {view === "forgotpassword" ? (
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
                  onChange={(e) => handleEmailChange(e.target.value)}
                  disabled={loading}
                  className="block w-full rounded-2xl border border-border bg-muted/20 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition focus:border-accent focus:bg-background focus:ring-1 focus:ring-accent"
                />
              </div>
              {emailError && (
                <p className="mt-1 text-[10px] font-semibold text-destructive">{emailError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-2xl bg-accent py-3 text-sm font-semibold text-black shadow-lg shadow-accent/20 transition hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset Link"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => switchView("signin")}
                className="text-xs font-medium text-accent hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* SIGN IN / SIGN UP FORM */
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {view === "signin" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition hover:bg-muted/40 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-x-0 h-px bg-border" />
                  <span className="relative bg-card px-3 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    or continue with email
                  </span>
                </div>
              </>
            )}

            {view === "signup" && (
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-semibold text-muted-foreground"
                >
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
                    onChange={(e) => handleFullNameChange(e.target.value)}
                    disabled={loading}
                    className="block w-full rounded-2xl border border-border bg-muted/20 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition focus:border-accent focus:bg-background focus:ring-1 focus:ring-accent"
                  />
                </div>
                {fullNameError && (
                  <p className="mt-1 text-[10px] font-semibold text-destructive">{fullNameError}</p>
                )}
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
                  onChange={(e) => handleEmailChange(e.target.value)}
                  disabled={loading}
                  className="block w-full rounded-2xl border border-border bg-muted/20 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition focus:border-accent focus:bg-background focus:ring-1 focus:ring-accent"
                />
              </div>
              {emailError && (
                <p className="mt-1 text-[10px] font-semibold text-destructive">{emailError}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-muted-foreground"
              >
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
                  onChange={(e) => handlePasswordChange(e.target.value)}
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
              {passwordError && (
                <p className="mt-1 text-[10px] font-semibold text-destructive">{passwordError}</p>
              )}
              {view === "signin" && (
                <div className="mt-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => switchView("forgotpassword")}
                    className="text-xs text-accent hover:underline font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
              {view === "signup" && password && (
                <div className="mt-1.5 flex justify-between text-[10px] font-semibold">
                  <span className="text-muted-foreground">Password strength:</span>
                  <span className={strengthColor(getPasswordStrength(password))}>
                    {getPasswordStrength(password)}
                  </span>
                </div>
              )}
            </div>

            {view === "signup" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-muted-foreground"
                >
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
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    disabled={loading}
                    className="block w-full rounded-2xl border border-border bg-muted/20 py-2.5 pl-10 pr-10 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition focus:border-accent focus:bg-background focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground/50 hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="mt-1 text-[10px] font-semibold text-destructive">
                    {confirmPasswordError}
                  </p>
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
              ) : view === "signup" ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        )}

        {view !== "forgotpassword" && (
          <>
            {view === "signin" && (
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
                  className="flex w-full items-center justify-center rounded-2xl border border-border bg-transparent py-3 text-sm font-semibold text-foreground hover:bg-muted/40 transition shadow-sm cursor-pointer"
                >
                  Try Demo (no account)
                </button>
              </>
            )}

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  switchView(view === "signup" ? "signin" : "signup");
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {view === "signup" ? (
                  <>
                    Already have an account? <span className="text-accent underline">Sign in</span>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{" "}
                    <span className="text-accent underline">Register</span>
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
