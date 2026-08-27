import "server-only";

import { db } from "@/server/db";
import { computeMonthlyDues } from "@/server/services/dues";

/**
 * Everything one student's detail page and the public portal need, in a shape
 * both can render. Attendance is aggregated from the student's own rows rather
 * than their current batch's class list, so months spent in a previous batch
 * stay accurate after a transfer.
 */
export async function getStudentProfile(id: number) {
  const student = await db.student.findUnique({
    where: { id },
    include: {
      batch: true,
      college: true,
    },
  });
  if (!student) return null;

  const [attendances, payments, results, examBatches, noteDistributions, topPerformersAllBatches, topPerformersBatch] = await Promise.all([
    db.attendance.findMany({
      where: { studentId: id },
      orderBy: { attendanceDate: "desc" },
      select: { attendanceDate: true, status: true, source: true },
    }),
    db.payment.findMany({
      where: { studentId: id },
      orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
      select: {
        id: true,
        amount: true,
        paymentType: true,
        paymentDate: true,
        paymentMonth: true,
        paymentYear: true,
        method: true,
      },
    }),
    db.examResult.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
      include: {
        exam: true,
        batch: { select: { id: true, name: true, batchNumber: true } },
      },
    }),
    // Exams assigned to the student's current batch, used to surface the ones
    // they have no result for as "absent".
    student.batchId
      ? db.examBatch.findMany({
          where: { batchId: student.batchId },
          include: { exam: true },
          orderBy: { examDate: "desc" },
        })
      : Promise.resolve([]),
    db.noteDistribution.findMany({
      where: { studentId: id },
      orderBy: { distributedAt: "desc" },
      include: { note: { select: { id: true, name: true } } },
    }),
    // Top 10 performers across all batches (by total marks across all exams)
    db.student.findMany({
      where: {
        archived: false,
        examResults: {
          some: {
            status: "published",
          },
        },
      },
      select: {
        id: true,
        name: true,
        studentUid: true,
        batch: {
          select: {
            name: true,
            batchNumber: true,
          },
        },
        examResults: {
          where: {
            status: "published",
          },
          select: {
            totalMarks: true,
          },
        },
      },
      take: 100, // Get more to calculate totals properly
    }),
    // Top 5 performers in the student's batch (if they have one)
    student.batchId
      ? db.student.findMany({
          where: {
            batchId: student.batchId,
            archived: false,
            examResults: {
              some: {
                status: "published",
              },
            },
          },
          select: {
            id: true,
            name: true,
            studentUid: true,
            examResults: {
              where: {
                status: "published",
              },
              select: {
                totalMarks: true,
              },
            },
          },
          take: 50, // Get more to calculate totals properly
        })
      : Promise.resolve([]),
  ]);

  // Month-by-month attendance summary, newest first.
  const monthly = new Map<string, { month: number; year: number; total: number; present: number }>();
  for (const record of attendances) {
    const year = record.attendanceDate.getUTCFullYear();
    const month = record.attendanceDate.getUTCMonth() + 1;
    const key = `${year}-${month}`;
    const entry = monthly.get(key) ?? { month, year, total: 0, present: 0 };
    entry.total += 1;
    if (record.status === "present") entry.present += 1;
    monthly.set(key, entry);
  }

  const attendanceByMonth = [...monthly.values()].sort(
    (a, b) => b.year - a.year || b.month - a.month,
  );

  const resultExamIds = new Set(results.map((r) => r.examId));
  const admissionDate = student.admissionDate;

  const absentExams = examBatches
    .filter((assignment) => !resultExamIds.has(assignment.examId))
    // An exam held before the student enrolled is none of their business.
    .filter((assignment) => assignment.examDate >= admissionDate)
    .map((assignment) => ({
      examId: assignment.examId,
      examName: assignment.exam.examName,
      subjectName: assignment.exam.subjectName,
      examDate: assignment.examDate,
      mcqMarks: null as number | null,
      cqMarks: null as number | null,
      totalMarks: null as number | null,
      examTotal: assignment.exam.mcqMarks + assignment.exam.cqMarks,
      absent: true as const,
    }));

  const examDateByExamId = new Map(examBatches.map((a) => [a.examId, a.examDate]));

  const examResults = [
    ...results.map((result) => ({
      examId: result.examId,
      examName: result.exam.examName,
      subjectName: result.exam.subjectName,
      examDate: examDateByExamId.get(result.examId) ?? result.createdAt,
      mcqMarks: result.mcqMarks,
      cqMarks: result.cqMarks,
      totalMarks: result.totalMarks,
      examTotal: result.exam.mcqMarks + result.exam.cqMarks,
      absent: false as const,
    })),
    ...absentExams,
  ].sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());

  const dues = await computeMonthlyDues([
    {
      id: student.id,
      monthlyFee: student.monthlyFee,
      admissionDate: student.admissionDate,
      batchStartingDate: student.batch?.startingDate ?? null,
    },
  ]);

  const totalPresent = attendances.filter((a) => a.status === "present").length;

  // Calculate top performers
  const calculateTopPerformers = (students: typeof topPerformersAllBatches) => {
    return students
      .map((s) => ({
        id: s.id,
        name: s.name,
        studentUid: s.studentUid,
        batchName: s.batch?.name ?? (s.batch ? `Batch ${s.batch.batchNumber}` : null),
        totalMarks: s.examResults.reduce((sum, r) => sum + r.totalMarks, 0),
        examCount: s.examResults.length,
      }))
      .sort((a, b) => b.totalMarks - a.totalMarks);
  };

  const topAllBatches = calculateTopPerformers(topPerformersAllBatches).slice(0, 10);
  const topBatch = student.batchId ? calculateTopPerformers(topPerformersBatch).slice(0, 5) : [];

  return {
    student: {
      ...student,
      admissionFee: Number(student.admissionFee),
      monthlyFee: Number(student.monthlyFee),
      modelTestFee: student.modelTestFee === null ? null : Number(student.modelTestFee),
    },
    attendanceByMonth,
    attendanceTotals: {
      classes: attendances.length,
      present: totalPresent,
      absent: attendances.length - totalPresent,
      rate: attendances.length ? (totalPresent / attendances.length) * 100 : 0,
    },
    payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    totalPaid: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    dues: dues.get(student.id) ?? null,
    examResults,
    noteDistributions,
    topPerformersAllBatches: topAllBatches,
    topPerformersBatch: topBatch,
  };
}

export type StudentProfile = NonNullable<Awaited<ReturnType<typeof getStudentProfile>>>;
