"use client";

import { SessionProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Every page/API route already re-validates the session server-side via
  // getServerSession, so a client-side refetch-on-focus loop just adds load
  // without adding correctness — and in some automated/headless browser
  // contexts, visibilitychange can fire repeatedly and cause a request storm.
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
