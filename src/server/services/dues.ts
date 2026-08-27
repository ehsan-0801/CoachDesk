import "server-only";

import { db } from "@/server/db";

/** Labels the finance screens store on payments. */
export const MONTHLY_FEE_LABEL = "মাসিক ফি";
export const ADMISSION_FEE_LABEL = "ভর্তি ফি";
export const MODEL_TEST_FEE_LABEL = "মডেল টেস্ট ফি";

export interface StudentDue {
  studentId: number;
  expected: number;
  paid: number;
  due: number;
  /** Months counted as billable, oldest first. */
  months: { month: number; year: number }[];
  /** True while a student is inside their grace window (see below). */
  isNew: boolean;
}

interface DuesInput {
  id: number;
  monthlyFee: unknown;
  admissionDate: Date;
  batchStartingDate: Date | null;
}

/**
 * A student starts owing from whichever came later: the day they enrolled, or
 * the day their batch began. Billing from the batch date alone would charge a
 * late joiner for months they were not there; billing from the admission date
 * alone would charge an early sign-up for months before teaching started.
 */
export function effectiveStartDate(admissionDate: Date, batchStartingDate: Date | null): Date {
  if (!batchStartingDate) return admissionDate;
  return batchStartingDate > admissionDate ? batchStartingDate : admissionDate;
}

const monthKey = (year: number, month: number) => year * 100 + month;

/** Inclusive `{month, year}` list between two month markers, oldest first. */
function billableMonths(from: Date, to: Date): { month: number; year: number }[] {
  const months: { month: number; year: number }[] = [];
  let year = from.getUTCFullYear();
  let month = from.getUTCMonth();
  const endYear = to.getUTCFullYear();
  const endMonth = to.getUTCMonth();

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ month: month + 1, year });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return months;
}

/**
 * Computes monthly-fee dues for a set of students in one extra query, however
 * many students are involved.
 *
 * `graceMonths` is the window a freshly enrolled student is left alone for: a
 * student who joined this month has not missed anything yet, and listing them
 * as a defaulter on day one is what made the legacy report unusable.
 */
export async function computeMonthlyDues(
  students: DuesInput[],
  options: { asOf?: Date; graceMonths?: number } = {},
): Promise<Map<number, StudentDue>> {
  const result = new Map<number, StudentDue>();
  if (!students.length) return result;

  const asOf = options.asOf ?? new Date();
  const graceMonths = options.graceMonths ?? 1;
  const asOfMonth = new Date(Date.UTC(asOf.getFullYear(), asOf.getMonth(), 1));
  const graceCutoff = new Date(Date.UTC(asOf.getFullYear(), asOf.getMonth() - graceMonths, 1));

  const payments = await db.payment.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      paymentType: MONTHLY_FEE_LABEL,
      isModelTest: false,
    },
    select: { studentId: true, amount: true, paymentMonth: true, paymentYear: true },
  });

  // studentId → YYYYMM → amount paid toward that month.
  const paidIndex = new Map<number, Map<number, number>>();
  for (const payment of payments) {
    if (!payment.paymentMonth || !payment.paymentYear) continue;
    const byMonth = paidIndex.get(payment.studentId) ?? new Map<number, number>();
    const key = monthKey(payment.paymentYear, payment.paymentMonth);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(payment.amount));
    paidIndex.set(payment.studentId, byMonth);
  }

  for (const student of students) {
    const monthlyFee = Number(student.monthlyFee ?? 0);
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) continue;

    const start = effectiveStartDate(student.admissionDate, student.batchStartingDate);
    const startMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    if (startMonth > asOfMonth) continue;

    const isNew = startMonth >= graceCutoff;
    const months = billableMonths(startMonth, asOfMonth);
    const expected = monthlyFee * months.length;

    const byMonth = paidIndex.get(student.id);
    let paid = 0;
    for (const { month, year } of months) {
      paid += byMonth?.get(monthKey(year, month)) ?? 0;
    }

    result.set(student.id, {
      studentId: student.id,
      expected,
      paid,
      due: isNew ? 0 : Math.max(0, expected - paid),
      months,
      isNew,
    });
  }

  return result;
}

/** Sum of outstanding monthly fees across every active, non-model-test student. */
export async function totalOutstandingDues(asOf = new Date()): Promise<number> {
  const students = await db.student.findMany({
    where: { archived: false, isModelTest: false },
    select: {
      id: true,
      monthlyFee: true,
      admissionDate: true,
      batch: { select: { startingDate: true } },
    },
  });

  const dues = await computeMonthlyDues(
    students.map((s) => ({
      id: s.id,
      monthlyFee: s.monthlyFee,
      admissionDate: s.admissionDate,
      batchStartingDate: s.batch?.startingDate ?? null,
    })),
    { asOf },
  );

  let total = 0;
  for (const entry of dues.values()) total += entry.due;
  return total;
}
