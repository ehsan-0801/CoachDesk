import "server-only";

import { forbidden, redirect, unauthorized } from "next/navigation";

import { can, type PermissionAction, type SessionUser } from "@/lib/rbac";
import type { AppModule } from "@/lib/types";

import { getCurrentUser } from "./session";

/** Server-component guard: bounces anonymous visitors to the login screen. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Server-component guard for a module page. Renders the 403 boundary when the
 *  session is valid but the grant is missing, so the shell stays visible. */
export async function requirePermission(
  module: AppModule,
  action: PermissionAction = "view",
): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, module, action)) forbidden();
  return user;
}

/** Route-handler guard. Returns the user, or throws a Response the handler
 *  wrapper turns into the HTTP reply. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

export async function apiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
  return user;
}

export async function apiPermission(module: AppModule, action: PermissionAction = "view"): Promise<SessionUser> {
  const user = await apiUser();
  if (!can(user, module, action)) {
    throw new ApiError(403, `Missing ${action} permission for ${module}`, "FORBIDDEN");
  }
  return user;
}

export { unauthorized, forbidden };
