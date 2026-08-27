import { SessionProvider } from "@/components/providers/session-provider";
import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/server/auth";

/**
 * Everything under this route group is behind a session. The group is
 * parenthesised, so none of these URLs carry an `/admin` prefix — access is
 * decided per module by RBAC, not by which folder a page happens to live in.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <SessionProvider user={user}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
