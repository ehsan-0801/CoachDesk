import "server-only";

import { db } from "@/server/db";

function utcDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function listExams() {
  const exams = await db.exam.findMany({
    orderBy: { id: "desc" },
    include: { _count: { select: { examBatches: true, results: true } } },
  });
  return exams.map((exam) => ({
    ...exam,
    totalMarks: exam.mcqMarks + exam.cqMarks,
    batchCount: exam._count.examBatches,
    resultCount: exam._count.results,
  }));
}

export async function listExamAssignments() {
  const assignments = await db.examBatch.findMany({
    orderBy: [{ examDate: "desc" }, { id: "desc" }],
    include: {
      exam: true,
      batch: { select: { id: true, name: true, batchNumber: true, archived: true } },
    },
  });

  const resultCounts = await db.examResult.groupBy({
    by: ["examId", "batchId"],
    _count: { _all: true },
  });
  const countKey = (examId: number, batchId: number) => `${examId}:${batchId}`;
  const counts = new Map(
    resultCounts
      .filter((row) => row.batchId !== null)
      .map((row) => [countKey(row.examId, row.batchId!), row._count._all]),
  );

  return assignments.map((assignment) => ({
    ...assignment,
    totalMarks: assignment.exam.mcqMarks + assignment.exam.cqMarks,
    resultCount: counts.get(countKey(assignment.examId, assignment.batchId)) ?? 0,
  }));
}

/** Exams assigned to a batch, for the result-entry pickers. */
export async function listExamsForBatch(batchId: number) {
  const assignments = await db.examBatch.findMany({
    where: { batchId },
    orderBy: { examDate: "desc" },
    include: { exam: true },
  });
  return assignments.map((assignment) => ({
    examId: assignment.examId,
    examName: assignment.exam.examName,
    subjectName: assignment.exam.subjectName,
    examDate: assignment.examDate,
    mcqMarks: assignment.exam.mcqMarks,
    cqMarks: assignment.exam.cqMarks,
  }));
}

/**
 * Result-entry sheet: the batch roster with any marks already recorded.
 *
 * Students admitted after the exam date are excluded — they were not in the
 * room, so leaving them on the sheet would only invite a wrong "absent".
 */
export async function getResultSheet(batchId: number, examId: number) {
  const [assignment, students, results] = await Promise.all([
    db.examBatch.findUnique({
      where: { examId_batchId: { examId, batchId } },
      include: { exam: true, batch: { select: { id: true, name: true, batchNumber: true } } },
    }),
    db.student.findMany({
      where: { batchId, archived: false },
      orderBy: [{ studentUid: "asc" }],
      select: { id: true, name: true, studentUid: true, admissionDate: true, phone: true, parentPhone: true },
    }),
    db.examResult.findMany({ where: { batchId, examId } }),
  ]);

  if (!assignment) return null;

  const byStudent = new Map(results.map((row) => [row.studentId, row]));

  return {
    assignment,
    exam: assignment.exam,
    totalMarks: assignment.exam.mcqMarks + assignment.exam.cqMarks,
    students: students
      .filter((student) => student.admissionDate <= assignment.examDate)
      .map((student) => {
        const existing = byStudent.get(student.id);
        return {
          id: student.id,
          name: student.name,
          studentUid: student.studentUid,
          mcqMarks: existing?.mcqMarks ?? null,
          cqMarks: existing?.cqMarks ?? null,
          resultId: existing?.id ?? null,
          absent: !existing,
        };
      }),
  };
}

/** Published results with dense ranking, for the results list and the portal. */
export async function getExamResults(examId: number, batchId?: number) {
  const [exam, results] = await Promise.all([
    db.exam.findUnique({ where: { id: examId } }),
    db.examResult.findMany({
      where: { examId, ...(batchId ? { batchId } : {}), status: { not: "absent" } },
      include: {
        student: { select: { id: true, name: true, studentUid: true, archived: true } },
        batch: { select: { id: true, name: true, batchNumber: true } },
      },
    }),
  ]);

  if (!exam) return null;

  // Dense ranking: equal marks share a rank, and the next distinct mark takes
  // the immediately following rank rather than skipping.
  const sorted = [...results].sort(
    (a, b) => b.totalMarks - a.totalMarks || (a.student.studentUid ?? "").localeCompare(b.student.studentUid ?? ""),
  );

  let rank = 0;
  let previousMarks: number | null = null;
  const ranked = sorted.map((result) => {
    if (previousMarks === null || result.totalMarks !== previousMarks) rank += 1;
    previousMarks = result.totalMarks;
    return { ...result, rank };
  });

  const marks = ranked.map((r) => r.totalMarks);

  return {
    exam: { ...exam, totalMarks: exam.mcqMarks + exam.cqMarks },
    results: ranked,
    stats: {
      count: ranked.length,
      highest: marks.length ? Math.max(...marks) : 0,
      lowest: marks.length ? Math.min(...marks) : 0,
      average: marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0,
    },
  };
}

export async function getExamBatchOptions(examId: number) {
  const assignments = await db.examBatch.findMany({
    where: { examId },
    include: { batch: { select: { id: true, name: true, batchNumber: true } } },
    orderBy: { batchId: "asc" },
  });
  return assignments.map((a) => ({
    id: a.batch.id,
    label: a.batch.name ?? `#${a.batch.batchNumber}`,
    examDate: a.examDate,
  }));
}

export { utcDate as toExamDate };
