"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour = 3,600,000 ms
const STORAGE_KEY = "ph_payroll_last_activity";

export function SessionTimeoutListener() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only monitor standard users. Superadmins remain logged in during an open browser session.
    if (status !== "authenticated" || !session?.user || session.user.platformRole === "SUPER_ADMIN") {
      return;
    }

    const updateActivity = () => {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, now.toString());
    };

    // Initialize timestamp if not present
    if (!localStorage.getItem(STORAGE_KEY)) {
      updateActivity();
    }

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleUserActivity = () => {
      // Throttle updates to at most once per 10 seconds to minimize I/O overhead
      const last = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      if (Date.now() - last > 10000) {
        updateActivity();
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Storage listener to sync activity across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        // activity updated in another tab
      }
    };
    window.addEventListener("storage", handleStorage);

    // Periodic check for inactivity timeout
    const interval = setInterval(() => {
      const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY) || Date.now().toString(), 10);
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        localStorage.removeItem(STORAGE_KEY);
        signOut({ callbackUrl: "/login?expired=1" });
      }
    }, 15000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [session, status]);

  return null;
}
