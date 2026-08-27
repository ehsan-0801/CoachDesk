import type { AppModule } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";
import type { PermissionAction } from "@/lib/rbac";

export interface NavChild {
  href: string;
  label: (t: Dictionary) => string;
  /** Extra grant this child needs beyond the group's `view`. */
  action?: PermissionAction;
  /** Restricts the child to admins even when the module is granted. */
  adminOnly?: boolean;
}

export interface NavGroup {
  module: AppModule;
  href: string;
  label: (t: Dictionary) => string;
  icon: string;
  exact?: boolean;
  children?: NavChild[];
}

/**
 * The sidebar in one place. Every entry names a module, so what a user sees is
 * always exactly what `can(user, module, action)` allows — the menu can never
 * drift from the route guard.
 *
 * `icon` is a lucide-react export name, resolved in the sidebar component so
 * this module stays free of JSX and importable from the server.
 */
export const NAVIGATION: NavGroup[] = [
  {
    module: "dashboard",
    href: "/dashboard",
    label: (t) => t.nav.dashboard,
    icon: "LayoutDashboard",
    exact: true,
  },
  {
    module: "batches",
    href: "/batches",
    label: (t) => t.nav.batches,
    icon: "Layers",
    children: [
      { href: "/batches", label: (t) => t.nav.batchList },
      { href: "/batches/new", label: (t) => t.nav.batchNew, action: "create" },
    ],
  },
  {
    module: "students",
    href: "/students",
    label: (t) => t.nav.students,
    icon: "GraduationCap",
    children: [
      { href: "/students", label: (t) => t.nav.studentList },
      { href: "/students/admission", label: (t) => t.nav.studentAdmission, action: "create" },
      { href: "/students/transfer", label: (t) => t.nav.studentTransfer, action: "update" },
      { href: "/students/name-change", label: (t) => t.nav.studentNameChange, action: "update" },
      { href: "/students/no-parent-phone", label: (t) => t.nav.studentNoParentPhone },
      { href: "/students/archived", label: (t) => t.nav.studentArchived },
    ],
  },
  {
    module: "attendance",
    href: "/attendance",
    label: (t) => t.nav.attendance,
    icon: "CalendarCheck",
    children: [
      { href: "/attendance/take", label: (t) => t.nav.attendanceTake, action: "create" },
      { href: "/attendance/manual", label: (t) => t.nav.attendanceManual, action: "create" },
      { href: "/attendance/daily", label: (t) => t.nav.attendanceDaily },
      { href: "/attendance/monthly", label: (t) => t.nav.attendanceMonthly },
    ],
  },
  {
    module: "exams",
    href: "/exams",
    label: (t) => t.nav.exams,
    icon: "ClipboardList",
    children: [
      { href: "/exams", label: (t) => t.nav.examCreate, action: "create" },
      { href: "/exams/assign", label: (t) => t.nav.examAssign, action: "create" },
      { href: "/exams/results/batch-wise", label: (t) => t.nav.examResultBatch, action: "create" },
      { href: "/exams/results/student-wise", label: (t) => t.nav.examResultStudent, action: "create" },
      { href: "/exams/results", label: (t) => t.nav.examResults },
    ],
  },
  {
    module: "notes",
    href: "/notes",
    label: (t) => t.nav.notes,
    icon: "BookOpen",
    children: [
      { href: "/notes", label: (t) => t.nav.noteInventory },
      { href: "/notes/create", label: (t) => t.nav.noteCreate, action: "create", adminOnly: true },
      { href: "/notes/distribute/batch", label: (t) => t.nav.noteDistributeBatch, action: "create" },
      { href: "/notes/distribute/manual", label: (t) => t.nav.noteDistributeManual, action: "create" },
    ],
  },
  {
    module: "payments",
    href: "/payments",
    label: (t) => t.nav.payments,
    icon: "Wallet",
    children: [
      { href: "/payments/new", label: (t) => t.nav.paymentNew, action: "create" },
      { href: "/payments", label: (t) => t.nav.paymentReport },
      { href: "/payments/dues", label: (t) => t.nav.paymentDues },
      { href: "/payments/today", label: (t) => t.nav.paymentToday },
      { href: "/payments/ledger", label: (t) => t.nav.paymentByStudent },
      { href: "/payments/fee-types", label: (t) => t.nav.paymentFeeTypes, action: "update" },
    ],
  },
  {
    module: "expenses",
    href: "/expenses",
    label: (t) => t.nav.expenses,
    icon: "Receipt",
    children: [
      { href: "/expenses", label: (t) => t.nav.expenseList },
      { href: "/expenses/new", label: (t) => t.nav.expenseNew, action: "create" },
      { href: "/expenses/types", label: (t) => t.nav.expenseTypes, action: "create" },
    ],
  },
  {
    module: "colleges",
    href: "/colleges",
    label: (t) => t.nav.colleges,
    icon: "School",
    exact: true,
  },
  {
    module: "homepage",
    href: "/homepage",
    label: (t) => t.nav.homepage,
    icon: "Globe",
    children: [
      { href: "/homepage/announcements", label: (t) => t.nav.homepageAnnouncements },
      { href: "/homepage/batch-info", label: (t) => t.nav.homepageBatchInfo },
    ],
  },
  {
    module: "sms",
    href: "/sms",
    label: (t) => t.nav.sms,
    icon: "MessageSquare",
    children: [
      { href: "/sms", label: (t) => t.nav.smsTemplates },
      { href: "/sms/queue", label: (t) => t.nav.smsQueue },
      { href: "/sms/broadcast", label: (t) => t.nav.smsBatchwise },
    ],
  },
  {
    module: "users",
    href: "/users",
    label: (t) => t.nav.users,
    icon: "Users",
    exact: true,
  },
];
