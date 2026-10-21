"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldAlertIcon,
  LockIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldCheckIcon,
  KeyRoundIcon,
  LandmarkIcon,
  Building2Icon,
  ArrowRightIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const authError = searchParams.get("error");
  const reason = searchParams.get("reason");
  const expired = searchParams.get("expired");

  const [portalMode, setPortalMode] = useState<"WORKSPACE" | "REMITTANCES">(() => {
    if (callbackUrl && callbackUrl.includes("remittance")) return "REMITTANCES";
    return "WORKSPACE";
  });

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    email?: string;
    name?: string;
    role?: string;
    platformRole?: string;
  } | null>(null);

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const {
    register,
    handleSubmit,
    setFocus,
    getValues,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // Check if session is already active in this browser
  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data?.user) {
          setCurrentUser({
            email: data.user.email,
            name: data.user.name,
            role: data.user.companyRole,
            platformRole: data.user.platformRole,
          });
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (expired === "1" || reason === "idle") {
      toast.info("Your session expired due to inactivity. Please sign in again.");
    } else if (authError === "CredentialsSignin") {
      toast.error("Invalid email address or password");
    } else if (authError) {
      toast.error("Authentication failed. Please verify your credentials.");
    }
  }, [authError, reason, expired]);

  // Synchronize portalMode if callbackUrl changes dynamically
  useEffect(() => {
    if (callbackUrl && callbackUrl.includes("remittance")) {
      setPortalMode("REMITTANCES");
    }
  }, [callbackUrl]);

  async function onSubmit(values: LoginInput, overrideMode?: "WORKSPACE" | "REMITTANCES") {
    const activeMode = overrideMode || portalMode;
    setSubmitting(true);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setSubmitting(false);
      toast.error("Invalid credentials. Please verify your email and password.");
      return;
    }

    toast.success("Authentication successful! Redirecting...");

    const isRemittance =
      activeMode === "REMITTANCES" ||
      (callbackUrl && callbackUrl.includes("/remittances"));

    if (isRemittance) {
      // Direct access to Remittance Portal for any authorized user / Super Admin
      window.location.replace("/remittances");
      return;
    }

    let targetUrl =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "";

    if (!targetUrl || targetUrl === "/") {
      try {
        const sessRes = await fetch("/api/auth/session");
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          if (sessData?.user?.platformRole === "REMITTANCE_OFFICER" || (sessData?.user?.isRemittanceOfficer && !sessData?.user?.companyId)) {
            targetUrl = "/remittances";
          } else if (sessData?.user?.platformRole === "SUPER_ADMIN") {
            targetUrl = "/admin";
          } else {
            targetUrl = "/dashboard";
          }
        }
      } catch {
        targetUrl = values.email.toLowerCase().includes("admin") ? "/admin" : "/dashboard";
      }
    }

    if (!targetUrl) {
      targetUrl = "/dashboard";
    }

    // Force full window replacement to target route
    window.location.replace(targetUrl);
  }

  // Handler for the dedicated Remittance card button
  async function handleRemittanceCardClick() {
    // 1. If user is already authenticated in this session, immediately take them into remittances
    if (currentUser) {
      toast.success("Active session found! Opening Remittance Portal...");
      window.location.replace("/remittances");
      return;
    }

    // Also double check live session in case it just established
    try {
      const sessRes = await fetch("/api/auth/session");
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        if (sessData?.user) {
          toast.success("Active session detected! Entering Remittance Portal...");
          window.location.replace("/remittances");
          return;
        }
      }
    } catch {
      // Fall through to form action
    }

    // 2. Check if credentials are typed into form
    const currentValues = getValues();
    if (currentValues.email && currentValues.password) {
      setPortalMode("REMITTANCES");
      handleSubmit((data) => onSubmit(data, "REMITTANCES"))();
      return;
    }

    // 3. Switch mode to REMITTANCES, scroll to top of form, and focus input
    setPortalMode("REMITTANCES");
    toast.info("Remittance Portal mode active. Please enter your credentials to sign in.");
    if (!currentValues.email) {
      setFocus("email");
    } else {
      setFocus("password");
    }
  }

  async function handleForgotPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotError("Please enter your email address.");
      return;
    }

    setForgotSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || "There is no such email in the system.";
        setForgotError(errorMsg);
        toast.error(errorMsg);
        setForgotSubmitting(false);
        return;
      }

      const successMsg = data.message || "Password reset link sent! Check your inbox.";
      setForgotSuccess(successMsg);
      toast.success(successMsg);
      setForgotSubmitting(false);
    } catch (err) {
      console.error(err);
      const errText = "An unexpected error occurred. Please try again.";
      setForgotError(errText);
      toast.error(errText);
      setForgotSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Active Session Notification (if user is already logged in) */}
      {currentUser && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 backdrop-blur-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
                <CheckCircle2Icon className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Active Session:{" "}
                  <span className="text-emerald-300">
                    {currentUser.name || currentUser.email}
                  </span>
                </p>
                <p className="text-[11px] text-slate-300">
                  {currentUser.platformRole === "SUPER_ADMIN"
                    ? "Super Administrator"
                    : currentUser.platformRole === "REMITTANCE_OFFICER"
                    ? "Statutory Remittance Officer"
                    : "Payroll Administrator"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => window.location.replace("/remittances")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 font-semibold shadow-xs"
              >
                <LandmarkIcon className="size-3.5 mr-1.5" />
                Open Remittances →
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  window.location.replace(
                    currentUser.platformRole === "SUPER_ADMIN"
                      ? "/admin"
                      : "/dashboard"
                  )
                }
                className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200 text-xs h-8 px-2.5"
              >
                Workspace
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-xl gap-1">
        <button
          type="button"
          onClick={() => setPortalMode("WORKSPACE")}
          className={cn(
            "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            portalMode === "WORKSPACE"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          )}
        >
          <Building2Icon className="size-4" />
          <span>Company Workspace</span>
        </button>
        <button
          type="button"
          onClick={() => setPortalMode("REMITTANCES")}
          className={cn(
            "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            portalMode === "REMITTANCES"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          )}
        >
          <LandmarkIcon className="size-4" />
          <span>Remittance Portal</span>
        </button>
      </div>

      {/* Main Login Form Card */}
      <Card
        className={cn(
          "shadow-2xl backdrop-blur-xl rounded-2xl transition-all duration-300",
          portalMode === "REMITTANCES"
            ? "border-emerald-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-emerald-950/30 ring-1 ring-emerald-500/20"
            : "border-slate-800 bg-slate-900/90"
        )}
      >
        <CardHeader className="space-y-1.5 pb-3">
          {portalMode === "REMITTANCES" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-950/90 px-2.5 py-0.5 rounded-full border border-emerald-500/40 uppercase tracking-wider">
                  <LandmarkIcon className="size-3" /> Statutory Remittance Access
                </span>
              </div>
              <CardTitle className="text-lg font-bold text-slate-100">
                Sign in to Remittance Portal
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 leading-snug">
                Access consolidated statutory payables for SSS, PhilHealth, Pag-IBIG &amp; BIR across all companies, manage loans, and issue payment checks.
              </CardDescription>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-300 bg-blue-950/90 px-2.5 py-0.5 rounded-full border border-blue-500/40 uppercase tracking-wider">
                  <Building2Icon className="size-3" /> Company Workspace
                </span>
              </div>
              <CardTitle className="text-lg font-bold text-slate-100">
                Sign in to your workspace
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 leading-snug">
                Enter your registered email address and password to access company payroll administration.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit((d) => onSubmit(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                Email Address / Username
              </Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <Input
                  id="email"
                  type="text"
                  placeholder={
                    portalMode === "REMITTANCES"
                      ? "remittance.officer@domain.com or admin"
                      : "name@company.com"
                  }
                  autoComplete="email"
                  className={cn(
                    "pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 text-xs h-9 transition-colors",
                    portalMode === "REMITTANCES"
                      ? "focus:border-emerald-500 focus:ring-emerald-500/20"
                      : "focus:border-blue-500 focus:ring-blue-500/20"
                  )}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] font-medium text-rose-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true);
                    setForgotError("");
                    setForgotSuccess("");
                  }}
                  className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <LockIcon className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className={cn(
                    "pl-9 pr-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 text-xs h-9 transition-colors",
                    portalMode === "REMITTANCES"
                      ? "focus:border-emerald-500 focus:ring-emerald-500/20"
                      : "focus:border-blue-500 focus:ring-blue-500/20"
                  )}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-medium text-rose-400">{errors.password.message}</p>
              )}
            </div>

            {portalMode === "REMITTANCES" ? (
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                disabled={submitting}
              >
                <LandmarkIcon className="size-4" />
                <span>
                  {submitting ? "Signing in to Remittance Portal..." : "Sign in to Remittance Portal →"}
                </span>
              </Button>
            ) : (
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-10 shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                disabled={submitting}
              >
                <Building2Icon className="size-4" />
                <span>{submitting ? "Signing in..." : "Sign in to Workspace"}</span>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* External Statutory Contributions & Remittance Module Card */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-xl transition-all duration-300",
          portalMode === "REMITTANCES"
            ? "border-emerald-500/50 bg-gradient-to-b from-emerald-950/60 to-slate-900/90 ring-1 ring-emerald-500/30"
            : "border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-slate-900/90"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
            <LandmarkIcon className="size-5" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Statutory Contributions Portal
              </h2>
              <span className="text-[10px] font-semibold text-emerald-400/90 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {portalMode === "REMITTANCES" ? "Active Portal Selected" : "External Module"}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Authorized Liaison &amp; Remittance Officers: Consolidate cross-company SSS, PhilHealth, Pag-IBIG &amp; BIR payables, batch employee loans, and issue payment checks.
            </p>
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-emerald-500/20 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-medium">
            {portalMode === "REMITTANCES"
              ? "Use the login form above to enter the portal"
              : "Credentials configured by Super Admin"}
          </span>
          <button
            type="button"
            onClick={handleRemittanceCardClick}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-xl shadow-md shadow-emerald-950/50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <LandmarkIcon className="size-3.5" />
            <span>
              {portalMode === "REMITTANCES"
                ? "Enter Remittance Portal →"
                : "Access Remittance Portal →"}
            </span>
          </button>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100 text-base">
              <KeyRoundIcon className="size-5 text-blue-500" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Enter your account email address below. We will send you instructions to set a new password.
            </DialogDescription>
          </DialogHeader>

          {forgotError && (
            <div className="p-2.5 rounded-md bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium">
              {forgotError}
            </div>
          )}

          {forgotSuccess ? (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-medium">
                {forgotSuccess}
              </div>
              <Button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs h-9"
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-xs font-semibold text-slate-300">
                  Email Address
                </Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-2.5 size-4 text-slate-500" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 text-xs h-9 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotOpen(false)}
                  className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 shadow-md"
                >
                  {forgotSubmitting ? "Sending Link..." : "Send Reset Link"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 text-slate-100 dark overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Radial Background Ambient Accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-indigo-600/15 blur-3xl" />

      {/* Main Login Container */}
      <main className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-600/20">
            <ShieldAlertIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">PH Payroll SaaS</h1>
            <p className="text-xs text-slate-400 font-medium max-w-xs">
              Philippine Statutory Compliance, BIR Withholding &amp; Enterprise Payroll Platform
            </p>
          </div>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading sign in form...</div>}>
          <LoginForm />
        </Suspense>

        {/* Footer Security Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheckIcon className="size-3.5 text-emerald-500" />
          <span>256-bit SSL Encrypted Multi-Tenant Payroll Platform</span>
        </div>
      </main>
    </div>
  );
}
