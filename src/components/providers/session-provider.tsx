"use client";

import * as React from "react";

import type { SessionUser } from "@/lib/rbac";

const SessionContext = React.createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/** The signed-in user, as resolved on the server for this request. */
export function useSession(): SessionUser | null {
  return React.useContext(SessionContext);
}
