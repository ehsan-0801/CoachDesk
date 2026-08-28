import { notFound } from "next/navigation";

import { CSV_ROW_LIMIT, csvFilename, csvResponse, toCsv, type CsvColumn } from "@/lib/csv";
import { isoDate, startOfMonth } from "@/lib/utils";
import { requirePermission } from "@/server/auth";
import { listExpenses } from "@/server/queries/expenses";
import { getDayCollection, getDuesReport, listPayments } from "@/server/queries/payments";
import { listSmsMessages } from "@/server/queries/sms";
import { listStudents } from "@/server/queries/students";
import type { AppModule, SmsCategory, SmsStatus } from "@/lib/types";

/**
 * CSV export for the dashboard tables.
 *
 * Each dataset re-runs the *same* query the page runs, reading the *same*
 * search params, so an export always matches what the user is looking at —
 * across every page of it, not just the visible one. Permission is re-checked
 * here because this route is reachable directly.
 */

type Ctx = { params: Promise<{ dataset: string }> };

function day(value: Date | null | undefined): string {
  return value ? isoDate(value) : "";
}

/* ── column definitions ─────────────────────────────────────────────────── */

type StudentRow = Awaited<ReturnType<typeof listStudents>>["students"][number];

const STUDENT_COLUMNS: readonly CsvColumn<StudentRow>[] = [
  { header: "Student ID", value: (r) => r.studentUid },
  { header: "Name", value: (r) => r.name },
  { header: "Phone", value: (r) => r.phone },
  { header: "Parent Name", value: (r) => r.parentName },
  { header: "Parent Phone", value: (r) => r.parentPhone },
  { header: "Batch", value: (r) => r.batch?.name ?? (r.batch ? `#${r.batch.batchNumber}` : "") },
  { header: "HSC Year", value: (r) => r.hscYear },
  { header: "College", value: (r) => r.college?.name },
  { header: "College Roll", value: (r) => r.collegeRoll },
  { header: "Gender", value: (r) => r.gender },
  { header: "Division", value: (r) => r.division },
  { header: "Course Type", value: (r) => r.courseType },
  { header: "Admission Date", value: (r) => day(r.admissionDate) },
  { header: "Admission Fee", value: (r) => r.admissionFee },
  { header: "Monthly Fee", value: (r) => r.monthlyFee },
  { header: "Model Test Fee", value: (r) => r.modelTestFee },
  { header: "Outstanding Due", value: (r) => r.due },
  { header: "Model Test Only", value: (r) => (r.isModelTest ? "yes" : "no") },
  { header: "Archived", value: (r) => (r.archived ? "yes" : "no") },
  { header: "Comment", value: (r) => r.comment },
];

type PaymentRow = Awaited<ReturnType<typeof listPayments>>["payments"][number];

const PAYMENT_COLUMNS: readonly CsvColumn<PaymentRow>[] = [
  { header: "Date", value: (r) => day(r.paymentDate) },
  { header: "Student ID", value: (r) => r.student?.studentUid },
  { header: "Student", value: (r) => r.student?.name },
  { header: "Batch", value: (r) => r.batch?.name ?? (r.batch ? `#${r.batch.batchNumber}` : "") },
  { header: "Payment Type", value: (r) => r.paymentType },
  { header: "Month", value: (r) => r.paymentMonth },
  { header: "Year", value: (r) => r.paymentYear },
  { header: "Method", value: (r) => r.method },
  { header: "Amount", value: (r) => r.amount },
  { header: "Model Test", value: (r) => (r.isModelTest ? "yes" : "no") },
  { header: "Note", value: (r) => r.note },
];

type DuesRow = Awaited<ReturnType<typeof getDuesReport>>["rows"][number];

const DUES_COLUMNS: readonly CsvColumn<DuesRow>[] = [
  { header: "Student ID", value: (r) => r.studentUid },
  { header: "Name", value: (r) => r.name },
  { header: "Phone", value: (r) => r.phone },
  { header: "Parent Phone", value: (r) => r.parentPhone },
  { header: "Batch", value: (r) => r.batchLabel },
  { header: "Monthly Fee", value: (r) => r.monthlyFee },
  { header: "Billable Months", value: (r) => r.monthCount },
  { header: "Expected", value: (r) => r.expected },
  { header: "Paid", value: (r) => r.paid },
  { header: "Due", value: (r) => r.due },
  { header: "Billing Started", value: (r) => day(r.startedOn) },
  { header: "New Admission", value: (r) => (r.isNew ? "yes" : "no") },
];

type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>["expenses"][number];

const EXPENSE_COLUMNS: readonly CsvColumn<ExpenseRow>[] = [
  { header: "Date", value: (r) => day(r.expenseDate) },
  { header: "Type", value: (r) => r.expenseType?.name },
  { header: "Amount", value: (r) => Number(r.amount) },
  { header: "Quantity", value: (r) => r.quantity },
  { header: "Note", value: (r) => r.note?.name },
  { header: "Note Type", value: (r) => r.noteType },
  { header: "Print Type", value: (r) => r.printType },
  { header: "Description", value: (r) => r.description },
  { header: "Recorded By", value: (r) => r.recordedBy?.name },
];

type SmsRow = Awaited<ReturnType<typeof listSmsMessages>>["messages"][number];

const SMS_COLUMNS: readonly CsvColumn<SmsRow>[] = [
  { header: "Created", value: (r) => day(r.createdAt) },
  { header: "Sent", value: (r) => day(r.sentAt) },
  { header: "Category", value: (r) => r.category },
  { header: "Status", value: (r) => r.status },
  { header: "Recipient Type", value: (r) => r.recipientType },
  { header: "Phone", value: (r) => r.phone },
  { header: "Student ID", value: (r) => r.student?.studentUid },
  { header: "Student", value: (r) => r.student?.name },
  { header: "Batch", value: (r) => r.batch?.name ?? (r.batch ? `#${r.batch.batchNumber}` : "") },
  { header: "Body", value: (r) => r.body },
  { header: "Failure Reason", value: (r) => r.reason },
  { header: "Provider Ref", value: (r) => r.providerRef },
  { header: "Requested By", value: (r) => r.requestedBy?.name },
];

/**
 * Ties a dataset's columns to its row type, then erases the generic so the
 * datasets can share one lookup table. Without this the two halves are only
 * matched by convention and a mismatch compiles cleanly.
 */
function dataset<Row>(config: {
  module: AppModule;
  filename: string;
  columns: readonly CsvColumn<Row>[];
  load: (q: URLSearchParams) => Promise<readonly Row[]>;
}): Dataset {
  return {
    module: config.module,
    filename: config.filename,
    run: async (q) => toCsv(config.columns, await config.load(q)),
  };
}

type Dataset = {
  module: AppModule;
  filename: string;
  run: (q: URLSearchParams) => Promise<string>;
};

const DATASETS: Record<string, Dataset> = {
  students: dataset({
    module: "students",
    filename: "students",
    columns: STUDENT_COLUMNS,
    load: async (q) => {
      const scope = q.get("scope");
      const { students } = await listStudents({
        scope: scope === "archived" ? "archived" : scope === "all" ? "all" : "active",
        missingParentPhone: q.get("missingParentPhone") === "1",
        search: q.get("q") ?? undefined,
        batchId: q.get("batch") ? Number(q.get("batch")) : undefined,
        hscYear: q.get("year") ?? undefined,
        gender: (q.get("gender") as "male" | "female" | null) ?? undefined,
        page: 1,
        perPage: CSV_ROW_LIMIT,
        withDues: true,
      });
      return students;
    },
  }),
  payments: dataset({
    module: "payments",
    filename: "payments",
    columns: PAYMENT_COLUMNS,
    load: async (q) => {
      const { payments } = await listPayments({
        from: q.get("from") ?? isoDate(startOfMonth()),
        to: q.get("to") ?? isoDate(),
        batchId: q.get("batch") ? Number(q.get("batch")) : undefined,
        paymentType: q.get("type") ?? undefined,
        method: q.get("method") ?? undefined,
        search: q.get("q") ?? undefined,
        page: 1,
        perPage: CSV_ROW_LIMIT,
      });
      return payments;
    },
  }),
  "payments-today": dataset({
    module: "payments",
    filename: "collection",
    columns: PAYMENT_COLUMNS,
    load: async (q) => (await getDayCollection(q.get("date") ?? isoDate())).payments,
  }),
  "payments-dues": dataset({
    module: "payments",
    filename: "dues",
    columns: DUES_COLUMNS,
    load: async (q) => {
      const { rows } = await getDuesReport({
        batchId: q.get("batch") ? Number(q.get("batch")) : undefined,
        hscYear: q.get("year") ?? undefined,
        search: q.get("q") ?? undefined,
      });
      return rows;
    },
  }),
  expenses: dataset({
    module: "expenses",
    filename: "expenses",
    columns: EXPENSE_COLUMNS,
    load: async (q) => {
      const { expenses } = await listExpenses({
        from: q.get("from") ?? isoDate(startOfMonth()),
        to: q.get("to") ?? isoDate(),
        expenseTypeId: q.get("type") ? Number(q.get("type")) : undefined,
        page: 1,
        perPage: CSV_ROW_LIMIT,
      });
      return expenses;
    },
  }),
  sms: dataset({
    module: "sms",
    filename: "sms-log",
    columns: SMS_COLUMNS,
    load: async (q) => {
      const categories = (q.get("categories") ?? "")
        .split(",")
        .filter(Boolean) as SmsCategory[];
      const { messages } = await listSmsMessages({
        category: (q.get("category") as SmsCategory | null) ?? undefined,
        categories: categories.length ? categories : undefined,
        status: (q.get("status") as SmsStatus | null) ?? undefined,
        batchId: q.get("batch") ? Number(q.get("batch")) : undefined,
        from: q.get("from") ?? undefined,
        to: q.get("to") ?? undefined,
        search: q.get("q") ?? undefined,
        page: 1,
        perPage: CSV_ROW_LIMIT,
      });
      return messages;
    },
  }),
};

/* ── handler ────────────────────────────────────────────────────────────── */

export async function GET(request: Request, { params }: Ctx) {
  const { dataset } = await params;
  const config = DATASETS[dataset];
  if (!config) notFound();

  // Exporting is reading, so it needs no more than view rights — but it needs
  // them on the same module as the page the button sits on.
  await requirePermission(config.module, "view");

  const csv = await config.run(new URL(request.url).searchParams);

  return csvResponse(csv, csvFilename(config.filename));
}
