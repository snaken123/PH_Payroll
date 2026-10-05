"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LockIcon, EyeIcon, EyeOffIcon, ShieldCheckIcon, KeyRoundIcon } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !email) {
      toast.error("Invalid password reset link. Missing token or email.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to reset password.");
        setSubmitting(false);
        return;
      }

      toast.success(data.message || "Password reset successfully!");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl rounded-2xl p-6 text-center">
        <p className="text-rose-400 font-medium text-sm">
          Invalid or incomplete password reset link.
        </p>
        <Link href="/login">
          <Button className="mt-4 bg-blue-600 hover:bg-blue-500 text-xs text-white">
            Return to Sign In
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl rounded-2xl">
      <CardHeader className="space-y-1.5 pb-3">
        <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <KeyRoundIcon className="size-5 text-blue-500" />
          Set New Password
        </CardTitle>
        <CardDescription className="text-xs text-slate-400">
          Enter a new password for account <span className="text-slate-200 font-semibold">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
              New Password
            </Label>
            <div className="relative">
              <LockIcon className="absolute left-3 top-2.5 size-4 text-slate-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-9 pr-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 text-xs h-9 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-300">
              Confirm New Password
            </Label>
            <div className="relative">
              <LockIcon className="absolute left-3 top-2.5 size-4 text-slate-500" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 text-xs h-9 focus:border-blue-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-9 shadow-md shadow-blue-600/20"
          >
            {submitting ? "Updating Password..." : "Update Password"}
          </Button>

          <div className="text-center pt-2">
            <Link href="/login" className="text-xs text-blue-400 hover:text-blue-300">
              Back to Sign In
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 text-slate-100 dark overflow-hidden selection:bg-blue-600 selection:text-white">
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-indigo-600/15 blur-3xl" />

      <main className="relative z-10 w-full max-w-md space-y-6">
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading reset password form...</div>}>
          <ResetPasswordForm />
        </Suspense>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheckIcon className="size-3.5 text-emerald-500" />
          <span>256-bit SSL Encrypted Password Reset</span>
        </div>
      </main>
    </div>
  );
}
