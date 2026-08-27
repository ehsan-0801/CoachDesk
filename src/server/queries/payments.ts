import "server-only";

import type { Prisma } from "@/lib/types";
import { db } from "@/server/db";
import {
  ADMISSION_FEE_LABEL,
  MONTHLY_FEE_LABEL,
  computeMonthlyDues,
  effectiveStartDate,
} from "@/server/services/dues";

export const PAYMENTS_PER_PAGE = 25;

function utcDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export interface PaymentFilters {
  from?: string;
  to?: string;
  batchId?: number;
  paymentType?: string;
  method?: string;
  search?: string;
  page?: number;
}

/** Ledger view: individual payment rows, filtered and paginated. */
export async function listPayments(filters: PaymentFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.PaymentWhereInput = {
    ...(filters.from || filters.to
      ? {
          paymentDate: {
            ...(filters.from ? { gte: utcDate(filters.from) } : {}),
            ...(filters.to ? { lte: utcDate(filters.to) } : {}),
          },
        }
      : {}),
    ...(filters.batchId ? { batchId: filters.batchId } : {}),
    ...(filters.paymentType ? { paymentType: filters.paymentType } : {}),
    ...(filters.method ? { method: filters.method as Prisma.PaymentWhereInput["method"] } : {}),
    ...(filters.search
      ? {
          student: {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { studentUid: { contains: filters.search, mode: "insensitive" } },
              { phone: { contains: filters.search } },
            ],
          },
        }
      : {}),
  };

  const [total, rows, sums] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAYMENTS_PER_PAGE,
      take: PAYMENTS_PER_PAGE,
      include: {
        student: { select: { id: true, name: true, studentUid: true, isModelTest: true } },
        batch: { select: { id: true, name: true, batchNumber: true } },
      },
    }),
    db.payment.groupBy({ by: ["paymentType"], where, _sum: { amount: true }, _count: { _all: true } }),
  ]);

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAYMENTS_PER_PAGE)),
    payments: rows.map((row) => ({ ...row, amount: Number(row.amount) })),
    byType: sums.map((row) => ({
      paymentType: row.paymentType,
      total: Number(row._sum.amount ?? 0),
      count: row._count._all,
    })),
    grandTotal: sums.reduce((sum, row) => sum + Number(row._sum.amount ?? 0), 0),
  };
}

/** Everything the "today's collection" screen shows for one day. */
export async function getDayCollection(date: string) {
  const day = utcDate(date);

  const [payments, byType] = await Promise.all([
    db.payment.findMany({
      where: { paymentDate: day },
      orderBy: { id: "desc" },
      include: {
        student: { select: { id: true, name: true, studentUid: true, phone: true, isModelTest: true } },
        batch: { select: { id: true, name: true, batchNumber: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    }),
    db.payment.groupBy({ by: ["paymentType"], where: { paymentDate: day }, _sum: { amount: true } }),
  ]);

  return {
    payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    total: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    uniqueStudents: new Set(payments.map((p) => p.studentId)).size,
    byType: byType.map((row) => ({ paymentType: row.paymentType, total: Number(row._sum.amount ?? 0) })),
  };
}

/**
 * Outstanding-dues report.
 *
 * Every active, non-model-test student is evaluated, not just those with a
 * payment row — a student who has never paid is exactly the one the report
 * exists to surface, and the legacy query missed them by starting from payments.
 */
export async function getDuesReport(filters: { batchId?: number; hscYear?: string; search?: string } = {}) {
  const students = await db.student.findMany({
    where: {
      archived: false,
      isModelTest: false,
      ...(filters.batchId ? { batchId: filters.batchId } : {}),
      ...(filters.hscYear ? { hscYear: filters.hscYear } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { studentUid: { contains: filters.search, mode: "insensitive" } },
              { phone: { contains: filters.search } },
            ],
          }
        : {}),
    },
    orderBy: [{ studentUid: "asc" }],
    select: {
      id: true,
      name: true,
      studentUid: true,
      phone: true,
      parentPhone: true,
      monthlyFee: true,
      admissionDate: true,
      batch: { select: { id: true, name: true, batchNumber: true, startingDate: true } },
    },
  });

  const dues = await computeMonthlyDues(
    students.map((s) => ({
      id: s.id,
      monthlyFee: s.monthlyFee,
      admissionDate: s.admissionDate,
      batchStartingDate: s.batch?.startingDate ?? null,
    })),
  );

  const rows = students
    .map((student) => {
      const entry = dues.get(student.id);
      return {
        id: student.id,
        name: student.name,
        studentUid: student.studentUid,
        phone: student.phone,
        parentPhone: student.parentPhone,
        monthlyFee: Number(student.monthlyFee),
        batchLabel: student.batch?.name ?? (student.batch ? `#${student.batch.batchNumber}` : null),
        expected: entry?.expected ?? 0,
        paid: entry?.paid ?? 0,
        due: entry?.due ?? 0,
        monthCount: entry?.months.length ?? 0,
        isNew: entry?.isNew ?? false,
        startedOn: effectiveStartDate(student.admissionDate, student.batch?.startingDate ?? null),
      };
    })
    .filter((row) => row.due > 0)
    .sort((a, b) => b.due - a.due);

  return {
    rows,
    totalDue: rows.reduce((sum, row) => sum + row.due, 0),
    studentCount: rows.length,
  };
}

/**
 * Per-student report: one row per billable month, plus admission fee, showing
 * paid versus expected. This is the view the desk uses when a parent asks
 * "what exactly do I owe?".
 */
export async function getStudentLedger(studentId: number) {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { batch: { select: { id: true, name: true, batchNumber: true, startingDate: true } } },
  });
  if (!student) return null;

  const payments = await db.payment.findMany({
    where: { studentId },
    orderBy: [{ paymentDate: "asc" }, { id: "asc" }],
  });

  const dues = await computeMonthlyDues([
    {
      id: student.id,
      monthlyFee: student.monthlyFee,
      admissionDate: student.admissionDate,
      batchStartingDate: student.batch?.startingDate ?? null,
    },
  ]);
  const entry = dues.get(student.id);

  const monthlyFee = Number(student.monthlyFee);
  const admissionFee = Number(student.admissionFee);

  const paidByMonth = new Map<number, { amount: number; ids: number[] }>();
  let admissionPaid = 0;
  const otherPayments: typeof payments = [];

  for (const payment of payments) {
    if (payment.paymentType === ADMISSION_FEE_LABEL) {
      admissionPaid += Number(payment.amount);
      continue;
    }
    if (payment.paymentType === MONTHLY_FEE_LABEL && payment.paymentMonth && payment.paymentYear) {
      const key = payment.paymentYear * 100 + payment.paymentMonth;
      const bucket = paidByMonth.get(key) ?? { amount: 0, ids: [] };
      bucket.amount += Number(payment.amount);
      bucket.ids.push(payment.id);
      paidByMonth.set(key, bucket);
      continue;
    }
    otherPayments.push(payment);
  }

  const monthRows = (entry?.months ?? []).map(({ month, year }) => {
    const bucket = paidByMonth.get(year * 100 + month);
    const paid = bucket?.amount ?? 0;
    return {
      month,
      year,
      expected: monthlyFee,
      paid,
      due: Math.max(0, monthlyFee - paid),
      paymentIds: bucket?.ids ?? [],
    };
  });

  return {
    student: {
      ...student,
      monthlyFee,
      admissionFee,
      modelTestFee: student.modelTestFee === null ? null : Number(student.modelTestFee),
    },
    admission: {
      expected: admissionFee,
      paid: admissionPaid,
      due: Math.max(0, admissionFee - admissionPaid),
    },
    monthRows: monthRows.reverse(),
    otherPayments: otherPayments.map((p) => ({ ...p, amount: Number(p.amount) })),
    totals: {
      expected: (entry?.expected ?? 0) + admissionFee,
      paid: (entry?.paid ?? 0) + admissionPaid,
      due: (entry?.due ?? 0) + Math.max(0, admissionFee - admissionPaid),
    },
  };
}

export async function listFeeTypes() {
  const rows = await db.feeType.findMany({ orderBy: { id: "asc" } });
  return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

export async function listPaymentTypeOptions() {
  const rows = await db.payment.findMany({ distinct: ["paymentType"], select: { paymentType: true } });
  return rows.map((r) => r.paymentType).sort();
}

export type DuesRow = Awaited<ReturnType<typeof getDuesReport>>["rows"][number];
export type StudentLedger = NonNullable<Awaited<ReturnType<typeof getStudentLedger>>>;
