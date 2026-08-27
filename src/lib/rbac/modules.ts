import type { AppModule, UserRole } from "@/lib/types";

export type PermissionAction = "view" | "create" | "update" | "delete";

/** The canonical module list. Everything RBAC-shaped reads from here: the
 *  permissions matrix screen, the sidebar, the route guard and the API guard. */
export const APP_MODULES = [
  "dashboard",
  "batches",
  "students",
  "attendance",
  "exams",
  "notes",
  "payments",
  "expenses",
  "colleges",
  "homepage",
  "sms",
  "users",
] as const satisfies readonly AppModule[];

export const PERMISSION_ACTIONS = ["view", "create", "update", "delete"] as const;

/**
 * Route prefix → module. The guard picks the longest matching prefix, so a more
 * specific entry always wins over a broader one.
 */
export const ROUTE_MODULE_MAP: Record<string, AppModule> = {
  "/dashboard": "dashboard",
  "/batches": "batches",
  "/students": "students",
  "/attendance": "attendance",
  "/exams": "exams",
  "/notes": "notes",
  "/payments": "payments",
  "/expenses": "expenses",
  "/colleges": "colleges",
  "/homepage": "homepage",
  "/sms": "sms",
  "/users": "users",
};

/** Modules only an admin may ever reach, whatever the permission rows say. */
export const ADMIN_ONLY_MODULES: readonly AppModule[] = ["users", "homepage", "sms"];

/** Screens that need more than their module's `view` grant. */
export const ROUTE_ACTION_OVERRIDES: { prefix: string; action: PermissionAction }[] = [
  { prefix: "/batches/new", action: "create" },
  { prefix: "/students/admission", action: "create" },
  { prefix: "/students/transfer", action: "update" },
  { prefix: "/students/name-change", action: "update" },
  { prefix: "/attendance/take", action: "create" },
  { prefix: "/attendance/manual", action: "create" },
  { prefix: "/exams/create", action: "create" },
  { prefix: "/exams/assign", action: "create" },
  { prefix: "/exams/results/batch-wise", action: "create" },
  { prefix: "/exams/results/student-wise", action: "create" },
  { prefix: "/notes/create", action: "create" },
  { prefix: "/notes/distribute", action: "create" },
  { prefix: "/payments/new", action: "create" },
  { prefix: "/payments/fee-types", action: "update" },
  { prefix: "/expenses/new", action: "create" },
  { prefix: "/expenses/types", action: "create" },
];

export function moduleForPath(pathname: string): AppModule | null {
  let best: { prefix: string; module: AppModule } | null = null;
  for (const [prefix, module] of Object.entries(ROUTE_MODULE_MAP)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best.prefix.length) best = { prefix, module };
    }
  }
  return best?.module ?? null;
}

export function actionForPath(pathname: string): PermissionAction {
  let best: { prefix: string; action: PermissionAction } | null = null;
  for (const entry of ROUTE_ACTION_OVERRIDES) {
    if (pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)) {
      if (!best || entry.prefix.length > best.prefix.length) best = entry;
    }
  }
  return best?.action ?? "view";
}

/** Grants handed to a brand-new user of each role before anyone edits them. */
export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Partial<Record<AppModule, PermissionAction[]>>> = {
  admin: Object.fromEntries(APP_MODULES.map((m) => [m, [...PERMISSION_ACTIONS]])),
  manager: {
    dashboard: ["view"],
    batches: ["view", "create", "update"],
    students: ["view", "create", "update"],
    attendance: ["view", "create", "update"],
    exams: ["view", "create", "update"],
    notes: ["view", "create", "update"],
    payments: ["view", "create"],
    expenses: ["view", "create"],
    colleges: ["view"],
  },
  staff: {
    dashboard: ["view"],
    students: ["view"],
    attendance: ["view", "create"],
  },
};
