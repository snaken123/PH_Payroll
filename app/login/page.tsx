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
import { toast } from "sonner";
import {
  ShieldAlertIcon,
  LockIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldCheckIcon,
  ClockIcon,
  UserCheckIcon,
  Building2Icon,
} from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const authError = searchParams.get("error");
  const reason = searchParams.get("reason");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<"ADMIN" | "ATTENDANCE">("ADMIN");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (reason === "idle") {
      toast.info("Your session expired due to 30 minutes of inactivity. Please sign in again.");
    } else if (authError === "CredentialsSignin") {
      toast.error("Invalid email, username, or password");
    } else if (authError) {
      toast.error("Authentication failed. Please verify your credentials.");
    }
  }, [authError, reason]);

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setSubmitting(false);
      toast.error("Invalid credentials. Please verify your username/email and password.");
      return;
    }

    toast.success("Authentication successful! Redirecting...");

    let targetUrl =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "";

    if (!targetUrl || targetUrl === "/") {
      if (loginMode === "ATTENDANCE") {
        targetUrl = "/dashboard/attendance";
      } else {
        targetUrl = values.email.toLowerCase().includes("admin") ? "/admin" : "/dashboard";
      }
    }

    // Force full window replacement to target route
    window.location.replace(targetUrl);
  }

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl rounded-2xl">
      <CardHeader className="space-y-3 pb-3">
        {/* Login Mode Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setLoginMode("ADMIN")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              loginMode === "ADMIN"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Building2Icon className="size-3.5" /> Workspace Sign In
          </button>
          <button
            type="button"
            onClick={() => setLoginMode("ATTENDANCE")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              loginMode === "ATTENDANCE"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <ClockIcon className="size-3.5" /> Attendance Staff
          </button>
        </div>

        <div>
          <CardTitle className="text-lg font-bold text-slate-100">
            {loginMode === "ADMIN" ? "Sign in to your workspace" : "Attendance Staff Kiosk Portal"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            {loginMode === "ADMIN"
              ? "Enter your credentials to access company payroll administration."
              : "Sign in with your attendance operator username to manage time records."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
              {loginMode === "ADMIN" ? "Email Address" : "Attendance Portal Username"}
            </Label>
            <div className="relative">
              {loginMode === "ADMIN" ? (
                <MailIcon className="absolute left-3 top-2.5 size-4 text-slate-500" />
              ) : (
                <UserCheckIcon className="absolute left-3 top-2.5 size-4 text-slate-500" />
              )}
              <Input
                id="email"
                type="text"
                placeholder={loginMode === "ADMIN" ? "name@company.com" : "e.g. staff_manila"}
                autoComplete={loginMode === "ADMIN" ? "email" : "username"}
                className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 text-xs h-9 focus:border-blue-500 focus:ring-blue-500/20"
                {...register("email")}
              />
            </div>
            {errors.email && <p className="text-[11px] font-medium text-rose-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
              Password
            </Label>
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
            {submitting
              ? "Signing in..."
              : loginMode === "ADMIN"
              ? "Sign in to Dashboard"
              : "Sign in to Attendance Portal"}
          </Button>
        </form>
      </CardContent>
    </Card>
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
