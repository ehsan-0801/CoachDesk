import type { AppModule, UserRole } from "@/lib/types";

import { ADMIN_ONLY_MODULES, APP_MODULES, actionForPath, moduleForPath, type PermissionAction } from "./modules";

/** Compact permission map carried in the session and shipped to the client. */
export type PermissionMap = Partial<Record<AppModule, PermissionAction[]>>;

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  permissions: PermissionMap;
}

export function can(user: SessionUser | null, module: AppModule, action: PermissionAction = "view"): boolean {
  if (!user) return false;
  // An admin is the account that manages permissions; gating it on its own rows
  // would let a bad matrix edit lock everyone out of the app permanently.
  if (user.role === "admin") return true;
  if (ADMIN_ONLY_MODULES.includes(module)) return false;
  return user.permissions[module]?.includes(action) ?? false;
}

/** Whether `user` may open `pathname`, resolving both module and required action. */
export function canAccessPath(user: SessionUser | null, pathname: string): boolean {
  if (!user) return false;
  const module = moduleForPath(pathname);
  // Paths outside the module map (profile, settings) need only a valid session.
  if (!module) return true;
  return can(user, module, actionForPath(pathname));
}

export function visibleModules(user: SessionUser | null): AppModule[] {
  if (!user) return [];
  return APP_MODULES.filter((module) => can(user, module, "view"));
}

/** Expands `{ students: ["view","create"] }` into the DB's boolean columns. */
export function permissionMapToRows(userId: number, map: PermissionMap) {
  return APP_MODULES.map((module) => {
    const actions = map[module] ?? [];
    return {
      userId,
      module,
      canView: actions.includes("view"),
      canCreate: actions.includes("create"),
      canUpdate: actions.includes("update"),
      canDelete: actions.includes("delete"),
    };
  });
}

export function rowsToPermissionMap(
  rows: { module: AppModule; canView: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }[],
): PermissionMap {
  const map: PermissionMap = {};
  for (const row of rows) {
    const actions: PermissionAction[] = [];
    if (row.canView) actions.push("view");
    if (row.canCreate) actions.push("create");
    if (row.canUpdate) actions.push("update");
    if (row.canDelete) actions.push("delete");
    if (actions.length) map[row.module] = actions;
  }
  return map;
}
