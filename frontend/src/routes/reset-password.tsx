import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Lock, Eye, EyeOff, Sparkles, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordScreen,
});

function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        navigate({ to: "/" });
      }, 2000);
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-2xl backdrop-blur-md"
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-black shadow-lg shadow-accent/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Set New Password
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please enter your new password below
          </p>
        </div>

        {/* Success Alert */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
            <div className="font-medium leading-relaxed">
              Password updated successfully! Redirecting you to Sign In...
            </div>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-muted-foreground">
              New Password
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
                disabled={loading || success}
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
            {password && (
              <div className="mt-1.5 flex justify-between text-[10px] font-semibold">
                <span className="text-muted-foreground">Password strength:</span>
                <span className={strengthColor(getPasswordStrength(password))}>
                  {getPasswordStrength(password)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-muted-foreground">
              Confirm New Password
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
                disabled={loading || success}
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
            {confirmPassword && password !== confirmPassword && (
              <div className="mt-1 text-[10px] font-semibold text-rose-500">
                Passwords do not match.
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="flex w-full items-center justify-center rounded-2xl bg-accent py-3 text-sm font-semibold text-black shadow-lg shadow-accent/20 transition hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
