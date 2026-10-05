"use client";

import { useEffect, useRef } from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";

// 1 hour = 60 minutes = 3,600,000 ms
const ONE_HOUR_MS = 60 * 60 * 1000;
const STORAGE_KEY = "ph_payroll_last_activity";

function SessionTimeoutListener() {
  const { data: session, status } = useSession();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    // Superadmin users DO NOT time out due to inactivity during an open browser session.
    if (session.user.platformRole === "SUPER_ADMIN") {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Standard users: 1-hour inactivity timeout
    const updateActivity = () => {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, now.toString());
      resetTimer();
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const last = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
        const elapsed = Date.now() - last;
        if (elapsed >= ONE_HOUR_MS) {
          localStorage.removeItem(STORAGE_KEY);
          signOut({ redirect: false }).finally(() => {
            window.location.href = "/login?expired=1";
          });
        } else {
          // Reset timer for remaining time
          timerRef.current = setTimeout(resetTimer, Math.max(1000, ONE_HOUR_MS - elapsed));
        }
      }, ONE_HOUR_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    const handleUserActivity = () => {
      const last = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      if (Date.now() - last > 10000) {
        updateActivity();
      }
    };

    events.forEach((event) => window.addEventListener(event, handleUserActivity, { passive: true }));

    // Start timer & initial activity stamp
    updateActivity();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, handleUserActivity));
    };
  }, [session, status]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Every page/API route already re-validates the session server-side via
  // getServerSession, so a client-side refetch-on-focus loop just adds load
  // without adding correctness — and in some automated/headless browser
  // contexts, visibilitychange can fire repeatedly and cause a request storm.
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <SessionTimeoutListener />
      {children}
    </SessionProvider>
  );
}
