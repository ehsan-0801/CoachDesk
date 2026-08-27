"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { apiPermission } from "@/server/auth";
import { db } from "@/server/db";
import { enqueueSms } from "@/server/sms";

function utcDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const examSchema = z.object({
  examName: z.string().trim().min(1).max(160),
  subjectName: z.string().trim().max(120).optional().nullable(),
  paperNumber: z.string().trim().max(40).optional().nullable(),
  chapter: z.string().trim().max(200).optional().nullable(),
  examType: z.string().trim().max(80).optional().nullable(),
  mcqMarks: z.coerce.number().int().min(0),
  cqMarks: z.coerce.number().int().min(0),
});

export async function saveExam(
  id: number | null,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await apiPermission("exams", id ? "update" : "create");

  const parsed = examSchema.safeParse({
    examName: formData.get("examName"),
    subjectName: formData.get("subjectName") || null,
    paperNumber: formData.get("paperNumber") || null,
    chapter: formData.get("chapter") || null,
    examType: formData.get("examType") || null,
    mcqMarks: formData.get("mcqMarks") ?? 0,
    cqMarks: formData.get("cqMarks") ?? 0,
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  if (parsed.data.mcqMarks + parsed.data.cqMarks <= 0) {
    return fail("An exam needs at least some marks.", { mcqMarks: "Set MCQ or CQ marks" });
  }

  try {
    if (id) await db.exam.update({ where: { id }, data: parsed.data });
    else await db.exam.create({ data: parsed.data });

    revalidatePath("/exams");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteExam(id: number): Promise<ActionResult> {
  await apiPermission("exams", "delete");

  try {
    await db.exam.delete({ where: { id } });
    revalidatePath("/exams");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

const assignSchema = z.object({
  examId: z.coerce.number().int().positive(),
  batchId: z.coerce.number().int().positive(),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});

export async function assignExamToBatch(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await apiPermission("exams", "create");

  const parsed = assignSchema.safeParse({
    examId: formData.get("examId"),
    batchId: formData.get("batchId"),
    examDate: formData.get("examDate"),
    startTime: formData.get("startTime") || null,
    endTime: formData.get("endTime") || null,
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  const { examId, batchId, examDate, startTime, endTime } = parsed.data;

  try {
    // Re-assigning the same exam to the same batch updates the schedule rather
    // than failing on the unique index — the desk reschedules constantly.
    await db.examBatch.upsert({
      where: { examId_batchId: { examId, batchId } },
      create: { examId, batchId, examDate: utcDate(examDate), startTime, endTime },
      update: { examDate: utcDate(examDate), startTime, endTime },
    });

    revalidatePath("/exams/assign");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteExamAssignment(id: number): Promise<ActionResult> {
  await apiPermission("exams", "delete");

  try {
    await db.examBatch.delete({ where: { id } });
    revalidatePath("/exams/assign");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export interface ResultEntry {
  studentId: number;
  mcqMarks: number | null;
  cqMarks: number | null;
  /** Absent students get no result row at all, so they stay out of the ranking. */
  absent: boolean;
}

/**
 * Saves a whole batch's results in one go.
 *
 * Present students are upserted; students marked absent have any previous row
 * removed, which is what makes correcting a mistaken entry possible without a
 * separate "delete result" step.
 */
export async function saveBatchResults(input: {
  examId: number;
  batchId: number;
  entries: ResultEntry[];
}): Promise<ActionResult<{ saved: number; absent: number }>> {
  const user = await apiPermission("exams", "create");
  if (!input.entries.length) return fail("Nothing to save.");

  try {
    const exam = await db.exam.findUnique({ where: { id: input.examId } });
    if (!exam) return fail("Exam not found.");

    const present = input.entries.filter((entry) => !entry.absent);
    const absent = input.entries.filter((entry) => entry.absent);

    // Marks above the paper's total are a data-entry slip, not a valid score.
    for (const entry of present) {
      if ((entry.mcqMarks ?? 0) > exam.mcqMarks || (entry.cqMarks ?? 0) > exam.cqMarks) {
        return fail(`Marks cannot exceed MCQ ${exam.mcqMarks} / CQ ${exam.cqMarks}.`);
      }
    }

    await db.$transaction([
      ...present.map((entry) =>
        db.examResult.upsert({
          where: { examId_studentId: { examId: input.examId, studentId: entry.studentId } },
          create: {
            examId: input.examId,
            studentId: entry.studentId,
            batchId: input.batchId,
            mcqMarks: entry.mcqMarks,
            cqMarks: entry.cqMarks,
            totalMarks: (entry.mcqMarks ?? 0) + (entry.cqMarks ?? 0),
            status: "published",
            recordedById: user.id,
          },
          update: {
            batchId: input.batchId,
            mcqMarks: entry.mcqMarks,
            cqMarks: entry.cqMarks,
            totalMarks: (entry.mcqMarks ?? 0) + (entry.cqMarks ?? 0),
            status: "published",
            recordedById: user.id,
          },
        }),
      ),
      ...(absent.length
        ? [
            db.examResult.deleteMany({
              where: { examId: input.examId, studentId: { in: absent.map((e) => e.studentId) } },
            }),
          ]
        : []),
    ]);

    await queueResultSms(input.examId, input.batchId, present.map((e) => e.studentId), absent.map((e) => e.studentId), user.id);

    revalidatePath("/exams/results");
    return succeed({ saved: present.length, absent: absent.length });
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteExamResult(id: number): Promise<ActionResult> {
  await apiPermission("exams", "delete");

  try {
    await db.examResult.delete({ where: { id } });
    revalidatePath("/exams/results");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/** Composes result and exam-absent messages for a saved sheet. */
async function queueResultSms(
  examId: number,
  batchId: number,
  presentIds: number[],
  absentIds: number[],
  userId: number,
) {
  const [exam, assignment, batch, results, students] = await Promise.all([
    db.exam.findUnique({ where: { id: examId } }),
    db.examBatch.findUnique({ where: { examId_batchId: { examId, batchId } } }),
    db.batch.findUnique({ where: { id: batchId }, select: { name: true, batchNumber: true } }),
    db.examResult.findMany({ where: { examId, batchId } }),
    db.student.findMany({
      where: { id: { in: [...presentIds, ...absentIds] } },
      select: { id: true, name: true, studentUid: true, phone: true, parentPhone: true },
    }),
  ]);
  if (!exam) return;

  const studentById = new Map(students.map((s) => [s.id, s]));
  const resultByStudent = new Map(results.map((r) => [r.studentId, r]));
  const highest = results.length ? Math.max(...results.map((r) => r.totalMarks)) : 0;
  const batchName = batch?.name ?? `Batch ${batch?.batchNumber ?? batchId}`;
  const examDate = assignment?.examDate.toISOString().slice(0, 10) ?? "";

  if (presentIds.length) {
    await enqueueSms({
      category: "result",
      requestedBy: userId,
      recipients: presentIds.flatMap((studentId) => {
        const student = studentById.get(studentId);
        const result = resultByStudent.get(studentId);
        if (!student || !result) return [];
        return [
          {
            studentId,
            batchId,
            studentPhone: student.phone,
            parentPhone: student.parentPhone,
            context: {
              student_name: student.name,
              student_id: student.studentUid,
              exam_name: exam.examName,
              subject_name: exam.subjectName,
              exam_date: examDate,
              mcq_marks: result.mcqMarks ?? 0,
              cq_marks: result.cqMarks ?? 0,
              total_marks: result.totalMarks,
              exam_mcq_marks: exam.mcqMarks,
              exam_cq_marks: exam.cqMarks,
              exam_total_marks: exam.mcqMarks + exam.cqMarks,
              highest_marks: highest,
            },
          },
        ];
      }),
    });
  }

  if (absentIds.length) {
    await enqueueSms({
      category: "exam_absent",
      requestedBy: userId,
      recipients: absentIds.flatMap((studentId) => {
        const student = studentById.get(studentId);
        if (!student) return [];
        return [
          {
            studentId,
            batchId,
            studentPhone: student.phone,
            parentPhone: student.parentPhone,
            context: {
              student_name: student.name,
              student_id: student.studentUid,
              exam_name: exam.examName,
              exam_date: examDate,
              batch_name: batchName,
            },
          },
        ];
      }),
    });
  }
}
