import "server-only";

import { isoDate, startOfMonth } from "@/lib/utils";
import { db } from "@/server/db";
import { totalOutstandingDues } from "@/server/services/dues";

function utcDay(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export async function getDashboardData() {
  const now = new Date();
  const today = utcDay(now);
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const sixMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 5, 1));

  const [
    studentTotals,
    activeBatches,
    monthCollection,
    todayAttendance,
    recentPayments,
    byYear,
    byBatch,
    collectionSeries,
    outstanding,
  ] = await Promise.all([
    db.student.groupBy({
      by: ["gender"],
      where: { archived: false },
      _count: { _all: true },
    }),

    db.batch.count({ where: { archived: false } }),

    db.payment.aggregate({
      where: { paymentDate: { gte: monthStart } },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    db.attendance.groupBy({
      by: ["status"],
      where: { attendanceDate: today },
      _count: { _all: true },
    }),

    db.payment.findMany({
      take: 8,
      orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
      select: {
        id: true,
        amount: true,
        paymentType: true,
        paymentDate: true,
        method: true,
        student: { select: { id: true, name: true, studentUid: true } },
        batch: { select: { name: true, batchNumber: true } },
      },
    }),

    db.student.groupBy({
      by: ["hscYear", "gender"],
      where: { archived: false },
      _count: { _all: true },
    }),

    db.student.groupBy({
      by: ["batchId"],
      where: { archived: false, batchId: { not: null } },
      _count: { _all: true },
    }),

    // Monthly collection for the last six months, aggregated in the database
    // rather than by pulling every payment row into the app.
    db.$queryRaw<{ month: number; year: number; total: number }[]>`
      SELECT
        EXTRACT(MONTH FROM payment_date)::int AS month,
        EXTRACT(YEAR  FROM payment_date)::int AS year,
        COALESCE(SUM(amount), 0)::float8      AS total
      FROM payments
      WHERE payment_date >= ${sixMonthsAgo}
      GROUP BY 1, 2
      ORDER BY year, month
    `,

    totalOutstandingDues(now),
  ]);

  const batchNames = await db.batch.findMany({
    where: { id: { in: byBatch.map((b) => b.batchId!).filter(Boolean) } },
    select: { id: true, name: true, batchNumber: true, archived: true },
  });
  const batchNameById = new Map(batchNames.map((b) => [b.id, b]));

  const male = studentTotals.find((g) => g.gender === "male")?._count._all ?? 0;
  const female = studentTotals.find((g) => g.gender === "female")?._count._all ?? 0;
  const totalStudents = studentTotals.reduce((sum, g) => sum + g._count._all, 0);

  const present = todayAttendance.find((a) => a.status === "present")?._count._all ?? 0;
  const absent = todayAttendance.find((a) => a.status === "absent")?._count._all ?? 0;

  // Fold the (year, gender) grouping into one row per HSC year.
  const yearMap = new Map<string, { year: string; male: number; female: number; total: number }>();
  for (const row of byYear) {
    const entry = yearMap.get(row.hscYear) ?? { year: row.hscYear, male: 0, female: 0, total: 0 };
    if (row.gender === "male") entry.male += row._count._all;
    if (row.gender === "female") entry.female += row._count._all;
    entry.total += row._count._all;
    yearMap.set(row.hscYear, entry);
  }

  return {
    totalStudents,
    male,
    female,
    activeBatches,
    collectedThisMonth: Number(monthCollection._sum.amount ?? 0),
    paymentsThisMonth: monthCollection._count._all,
    outstandingDues: outstanding,
    attendanceToday: { present, absent, total: present + absent, date: isoDate(startOfMonth(now)) },
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentType: p.paymentType,
      paymentDate: p.paymentDate,
      method: p.method,
      studentId: p.student.id,
      studentName: p.student.name,
      studentUid: p.student.studentUid,
      batchLabel: p.batch?.name ?? (p.batch ? `#${p.batch.batchNumber}` : null),
    })),
    studentsByYear: [...yearMap.values()].sort((a, b) => a.year.localeCompare(b.year)),
    studentsByBatch: byBatch
      .map((row) => {
        const batch = batchNameById.get(row.batchId!);
        return {
          batchId: row.batchId!,
          label: batch?.name ?? `#${batch?.batchNumber ?? row.batchId}`,
          count: row._count._all,
          archived: batch?.archived ?? false,
        };
      })
      .filter((row) => !row.archived)
      .sort((a, b) => b.count - a.count),
    collectionSeries: collectionSeries.map((row) => ({
      month: row.month,
      year: row.year,
      total: Number(row.total),
    })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
