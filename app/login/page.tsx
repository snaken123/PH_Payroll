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
} from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const authError = searchParams.get("error");
  const reason = searchParams.get("reason");
  const expired = searchParams.get("expired");

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotResetUrl, setForgotResetUrl] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (expired === "1" || reason === "idle") {
      toast.info("Your session expired due to inactivity. Please sign in again.");
    } else if (authError === "CredentialsSignin") {
      toast.error("Invalid email address or password");
    } else if (authError) {
      toast.error("Authentication failed. Please verify your credentials.");
    }
  }, [authError, reason, expired]);

  async function onSubmit(values: LoginInput) {
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

    let targetUrl =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "";

    if (!targetUrl || targetUrl === "/") {
      targetUrl = values.email.toLowerCase().includes("admin") ? "/admin" : "/dashboard";
    }

    // Force full window replacement to target route
    window.location.replace(targetUrl);
  }

  async function handleForgotPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setForgotResetUrl("");

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
        if (data.resetUrl) {
          setForgotResetUrl(data.resetUrl);
        }
        toast.error(errorMsg);
        setForgotSubmitting(false);
        return;
      }

      const successMsg = data.message || "Password reset link sent! Check your inbox.";
      setForgotSuccess(successMsg);
      if (data.resetUrl) {
        setForgotResetUrl(data.resetUrl);
      }
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
    <>
      <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl rounded-2xl">
        <CardHeader className="space-y-1.5 pb-3">
          <CardTitle className="text-lg font-bold text-slate-100">
            Sign in to your workspace
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Enter your registered email address and password to access company payroll administration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                Email Address / Username
              </Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <Input
                  id="email"
                  type="text"
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 text-xs h-9 focus:border-blue-500 focus:ring-blue-500/20"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-[11px] font-medium text-rose-400">{errors.email.message}</p>}
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
                  className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
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
                  className="pl-9 pr-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 text-xs h-9 focus:border-blue-500 focus:ring-blue-500/20"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] font-medium text-rose-400">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-9 shadow-md shadow-blue-600/20 transition-all"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in to Workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>

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
            <div className="p-2.5 rounded-md bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium space-y-2">
              <p>{forgotError}</p>
              {forgotResetUrl && (
                <div className="pt-1">
                  <a
                    href={forgotResetUrl}
                    className="inline-block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1.5 px-3 rounded text-xs transition-colors"
                  >
                    Click Here to Set New Password Now →
                  </a>
                </div>
              )}
            </div>
          )}

          {forgotSuccess ? (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-medium space-y-2">
                <p>{forgotSuccess}</p>
                {forgotResetUrl && (
                  <div className="pt-1">
                    <a
                      href={forgotResetUrl}
                      className="inline-block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1.5 px-3 rounded text-xs transition-colors"
                    >
                      Click Here to Set New Password Now →
                    </a>
                  </div>
                )}
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
    </>
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
