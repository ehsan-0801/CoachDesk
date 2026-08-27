"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, type ActionResult } from "@/lib/action-result";
import { apiPermission } from "@/server/auth";
import { db } from "@/server/db";
import { enqueueSms } from "@/server/sms";

const entrySchema = z.object({
  studentId: z.number().int().positive(),
  status: z.enum(["present", "absent"]),
});

const sheetSchema = z.object({
  batchId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(entrySchema).min(1),
});

function utcDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export type SaveAttendanceInput = z.infer<typeof sheetSchema>;

/**
 * Records a full attendance sheet.
 *
 * Re-submitting the same date overwrites the previous sheet instead of
 * erroring: correcting a mistake is the common case, and the unique index on
 * (student, date) makes an upsert the natural expression of that.
 */
export async function saveAttendance(input: SaveAttendanceInput): Promise<ActionResult<{ saved: number }>> {
  const user = await apiPermission("attendance", "create");

  const parsed = sheetSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid attendance data.");

  const { batchId, date, entries } = parsed.data;
  const day = utcDate(date);

  try {
    await db.$transaction([
      // A class-held row is what every attendance rate is computed against.
      db.classHeld.upsert({
        where: { batchId_classDate: { batchId, classDate: day } },
        create: { batchId, classDate: day, recordedById: user.id },
        update: { recordedById: user.id },
      }),
      ...entries.map((entry) =>
        db.attendance.upsert({
          where: { studentId_attendanceDate: { studentId: entry.studentId, attendanceDate: day } },
          create: {
            studentId: entry.studentId,
            batchId,
            attendanceDate: day,
            status: entry.status,
            source: "regular",
            recordedById: user.id,
          },
          update: { status: entry.status, batchId, source: "regular", recordedById: user.id },
        }),
      ),
    ]);

    await queueAttendanceSms(batchId, day, date, entries, user.id);

    revalidatePath("/attendance/daily");
    revalidatePath("/attendance/monthly");
    return succeed({ saved: entries.length });
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/**
 * Manual entry only ever upgrades a student from absent to present.
 *
 * It exists for latecomers whose absence was already recorded, so it must not
 * be able to mark anyone absent — that would let a second pass silently undo
 * the register taken at the start of class.
 */
export async function saveManualAttendance(
  input: { batchId: number; date: string; studentIds: number[] },
): Promise<ActionResult<{ created: number; updated: number; alreadyPresent: number }>> {
  const user = await apiPermission("attendance", "create");

  if (!input.studentIds.length) return fail("Select at least one student.");
  const day = utcDate(input.date);

  try {
    const existing = await db.attendance.findMany({
      where: { studentId: { in: input.studentIds }, attendanceDate: day },
      select: { studentId: true, status: true },
    });
    const existingByStudent = new Map(existing.map((row) => [row.studentId, row.status]));

    const toCreate = input.studentIds.filter((id) => !existingByStudent.has(id));
    const toUpdate = input.studentIds.filter((id) => existingByStudent.get(id) === "absent");
    const alreadyPresent = input.studentIds.filter((id) => existingByStudent.get(id) === "present");

    await db.$transaction([
      db.classHeld.upsert({
        where: { batchId_classDate: { batchId: input.batchId, classDate: day } },
        create: { batchId: input.batchId, classDate: day, recordedById: user.id },
        update: {},
      }),
      ...(toCreate.length
        ? [
            db.attendance.createMany({
              data: toCreate.map((studentId) => ({
                studentId,
                batchId: input.batchId,
                attendanceDate: day,
                status: "present" as const,
                source: "manual" as const,
                recordedById: user.id,
              })),
            }),
          ]
        : []),
      ...(toUpdate.length
        ? [
            db.attendance.updateMany({
              where: { studentId: { in: toUpdate }, attendanceDate: day },
              data: { status: "present", source: "manual", recordedById: user.id },
            }),
          ]
        : []),
    ]);

    const changed = [...toCreate, ...toUpdate];
    if (changed.length) {
      await queueAttendanceSms(
        input.batchId,
        day,
        input.date,
        changed.map((studentId) => ({ studentId, status: "present" as const })),
        user.id,
        "manual_attendance",
      );
    }

    revalidatePath("/attendance/daily");
    return succeed({
      created: toCreate.length,
      updated: toUpdate.length,
      alreadyPresent: alreadyPresent.length,
    });
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteDayAttendance(batchId: number, date: string): Promise<ActionResult> {
  await apiPermission("attendance", "delete");
  const day = utcDate(date);

  try {
    await db.$transaction([
      db.attendance.deleteMany({ where: { batchId, attendanceDate: day } }),
      db.classHeld.deleteMany({ where: { batchId, classDate: day } }),
    ]);
    revalidatePath("/attendance/daily");
    revalidatePath("/attendance/monthly");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/** Composes the present/absent messages for a saved sheet. */
async function queueAttendanceSms(
  batchId: number,
  day: Date,
  dateLabel: string,
  entries: { studentId: number; status: "present" | "absent" }[],
  userId: number,
  overrideCategory?: "manual_attendance",
) {
  const [batch, students] = await Promise.all([
    db.batch.findUnique({ where: { id: batchId }, select: { name: true, batchNumber: true } }),
    db.student.findMany({
      where: { id: { in: entries.map((e) => e.studentId) } },
      select: { id: true, name: true, studentUid: true, phone: true, parentPhone: true },
    }),
  ]);

  const studentById = new Map(students.map((s) => [s.id, s]));
  const batchName = batch?.name ?? `Batch ${batch?.batchNumber ?? batchId}`;

  const buckets: Record<"present" | "absent", typeof entries> = { present: [], absent: [] };
  for (const entry of entries) buckets[entry.status].push(entry);

  for (const status of ["present", "absent"] as const) {
    const bucket = buckets[status];
    if (!bucket.length) continue;

    await enqueueSms({
      category: overrideCategory ?? status,
      requestedBy: userId,
      recipients: bucket.flatMap((entry) => {
        const student = studentById.get(entry.studentId);
        if (!student) return [];
        return [
          {
            studentId: student.id,
            batchId,
            studentPhone: student.phone,
            parentPhone: student.parentPhone,
            context: {
              student_name: student.name,
              student_id: student.studentUid,
              batch_name: batchName,
              date: dateLabel,
            },
          },
        ];
      }),
    });
  }

  void day;
}
