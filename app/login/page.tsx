"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldAlertIcon, LockIcon, MailIcon, EyeIcon, EyeOffIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    setSubmitting(false);

    if (result?.error) {
      toast.error("Invalid email or password");
      return;
    }

    toast.success("Authentication successful. Redirecting...");
    router.push("/");
    router.refresh();
  }

  function prefillCredentials(email: string) {
    setValue("email", email);
    setValue("password", "ChangeMe123!");
    toast.info(`Prefilled credentials for ${email}`);
  }

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

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold text-slate-100">Sign in to your workspace</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Enter your credentials to access company payroll administration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                  Email Address
                </Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-2.5 size-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
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
                {submitting ? "Signing in..." : "Sign in to Dashboard"}
              </Button>
            </form>

            {/* Fast Demo Account Selector */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <SparklesIcon className="size-3 text-blue-400" /> Demo Quick Access Accounts
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => prefillCredentials("owner@demo-co.local")}
                  className="flex flex-col items-start p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 transition-colors text-left group"
                >
                  <span className="text-[11px] font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                    Company Owner
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">owner@demo-co.local</span>
                </button>
                <button
                  type="button"
                  onClick={() => prefillCredentials("admin@ph-payroll.local")}
                  className="flex flex-col items-start p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 transition-colors text-left group"
                >
                  <span className="text-[11px] font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                    Platform Super Admin
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">admin@ph-payroll.local</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Security Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheckIcon className="size-3.5 text-emerald-500" />
          <span>256-bit SSL Encrypted Multi-Tenant Payroll Platform</span>
        </div>
      </main>
    </div>
  );
}
