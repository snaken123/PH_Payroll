"use client";

import { useEffect, useRef } from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

function SessionTimeoutListener() {
  const { status } = useSession();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        signOut({ callbackUrl: "/login?reason=idle" });
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    // Start timer on initial mount
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [status]);

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
