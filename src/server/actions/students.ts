"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { apiPermission } from "@/server/auth";
import { db } from "@/server/db";
import { enqueueSms } from "@/server/sms";
import { ADMISSION_FEE_LABEL, MONTHLY_FEE_LABEL } from "@/server/services/dues";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

function toDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const admissionSchema = z.object({
  studentUid: z.string().trim().min(1).max(32),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(20).optional().nullable(),
  parentName: z.string().trim().max(160).optional().nullable(),
  parentPhone: z.string().trim().max(20).optional().nullable(),
  collegeId: z.coerce.number().int().positive().optional().nullable(),
  collegeRoll: z.string().trim().max(40).optional().nullable(),
  hscYear: z.string().trim().min(4).max(8),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  division: z.string().trim().max(60).optional().nullable(),
  courseType: z.string().trim().max(80).optional().nullable(),
  admissionDate: dateOnly,
  admissionFee: z.coerce.number().min(0),
  monthlyFee: z.coerce.number().min(0),
  modelTestFee: z.coerce.number().min(0).optional().nullable(),
  batchId: z.coerce.number().int().positive(),
  isModelTest: z.coerce.boolean().default(false),
  comment: z.string().trim().max(2000).optional().nullable(),
});

function readAdmissionForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return admissionSchema.safeParse({
    ...raw,
    collegeId: raw.collegeId ? raw.collegeId : null,
    gender: raw.gender || null,
    modelTestFee: raw.modelTestFee ? raw.modelTestFee : null,
    isModelTest: formData.get("isModelTest") === "on" || formData.get("isModelTest") === "true",
  });
}

/**
 * Admits a student and, in the same transaction, records whichever opening fees
 * were collected at the desk. Doing it atomically means a failed payment insert
 * can never leave a student who looks like they paid nothing.
 */
export async function admitStudent(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const user = await apiPermission("students", "create");

  const parsed = readAdmissionForm(formData);
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  const data = parsed.data;
  const collectAdmissionFee = formData.get("collectAdmissionFee") === "on";
  const collectFirstMonth = formData.get("collectFirstMonth") === "on";
  const admissionDate = toDateOnly(data.admissionDate);

  try {
    const student = await db.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id: data.batchId } });
      if (!batch) throw new Error("Selected batch no longer exists.");
      if (batch.archived) throw new Error("Cannot admit into an archived batch.");

      const created = await tx.student.create({
        data: {
          studentUid: data.studentUid,
          name: data.name,
          phone: data.phone || null,
          parentName: data.parentName || null,
          parentPhone: data.parentPhone || null,
          collegeId: data.collegeId ?? null,
          collegeRoll: data.collegeRoll || null,
          hscYear: data.hscYear,
          gender: data.gender ?? null,
          division: data.division || null,
          courseType: data.courseType || null,
          admissionDate,
          admissionFee: String(data.admissionFee),
          monthlyFee: String(data.isModelTest ? 0 : data.monthlyFee),
          modelTestFee: data.isModelTest ? String(data.modelTestFee ?? 0) : null,
          batchId: data.batchId,
          isModelTest: data.isModelTest,
          comment: data.comment || null,
          createdById: user.id,
        },
      });

      const payments = [];
      if (collectAdmissionFee && data.admissionFee > 0 && !data.isModelTest) {
        payments.push({
          studentId: created.id,
          batchId: data.batchId,
          paymentType: ADMISSION_FEE_LABEL,
          amount: String(data.admissionFee),
          paymentDate: admissionDate,
          paymentMonth: admissionDate.getUTCMonth() + 1,
          paymentYear: admissionDate.getUTCFullYear(),
          method: "cash" as const,
          recordedById: user.id,
        });
      }
      if (collectFirstMonth && data.monthlyFee > 0 && !data.isModelTest) {
        payments.push({
          studentId: created.id,
          batchId: data.batchId,
          paymentType: MONTHLY_FEE_LABEL,
          amount: String(data.monthlyFee),
          paymentDate: admissionDate,
          paymentMonth: admissionDate.getUTCMonth() + 1,
          paymentYear: admissionDate.getUTCFullYear(),
          method: "cash" as const,
          recordedById: user.id,
        });
      }
      if (payments.length) await tx.payment.createMany({ data: payments });

      return created;
    });

    // Composed and logged regardless; nothing leaves the building while SMS is off.
    await enqueueSms({
      category: "admission_confirmation",
      requestedBy: user.id,
      recipients: [
        {
          studentId: student.id,
          batchId: student.batchId,
          studentPhone: student.phone,
          parentPhone: student.parentPhone,
          context: {
            student_name: student.name,
            student_id: student.studentUid,
            batch_name: String(data.batchId),
            admission_fee: data.admissionFee,
            date: data.admissionDate,
          },
        },
      ],
    });

    revalidatePath("/students");
    return succeed({ id: student.id });
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function updateStudent(
  id: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await apiPermission("students", "update");

  const parsed = readAdmissionForm(formData);
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  const data = parsed.data;
  try {
    await db.student.update({
      where: { id },
      data: {
        studentUid: data.studentUid,
        name: data.name,
        phone: data.phone || null,
        parentName: data.parentName || null,
        parentPhone: data.parentPhone || null,
        collegeId: data.collegeId ?? null,
        collegeRoll: data.collegeRoll || null,
        hscYear: data.hscYear,
        gender: data.gender ?? null,
        division: data.division || null,
        courseType: data.courseType || null,
        admissionDate: toDateOnly(data.admissionDate),
        admissionFee: String(data.admissionFee),
        monthlyFee: String(data.isModelTest ? 0 : data.monthlyFee),
        modelTestFee: data.isModelTest ? String(data.modelTestFee ?? 0) : null,
        batchId: data.batchId,
        isModelTest: data.isModelTest,
        comment: data.comment || null,
      },
    });
    revalidatePath("/students");
    revalidatePath(`/students/${id}`);
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/** Moves students to another batch. Transferring also un-archives them, since a
 *  student being placed in a running batch is by definition active again. */
export async function transferStudents(studentIds: number[], batchId: number): Promise<ActionResult<{ moved: number }>> {
  await apiPermission("students", "update");
  if (!studentIds.length) return fail("Select at least one student.");

  try {
    const batch = await db.batch.findUnique({ where: { id: batchId } });
    if (!batch) return fail("Target batch not found.");
    if (batch.archived) return fail("Cannot move students into an archived batch.");

    const result = await db.student.updateMany({
      where: { id: { in: studentIds } },
      data: { batchId, archived: false },
    });

    revalidatePath("/students");
    return succeed({ moved: result.count });
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/** Archiving is one-click; restoring needs an active batch to return to. */
export async function setStudentArchived(
  id: number,
  archived: boolean,
  batchId?: number,
): Promise<ActionResult> {
  await apiPermission("students", "update");

  try {
    if (!archived) {
      const student = await db.student.findUnique({
        where: { id },
        include: { batch: { select: { id: true, archived: true } } },
      });
      if (!student) return fail("Student not found.");

      const targetBatchId = batchId ?? student.batchId;
      if (!targetBatchId) return fail("Pick an active batch to restore this student into.");

      const batch = await db.batch.findUnique({ where: { id: targetBatchId } });
      if (!batch || batch.archived) return fail("Pick an active batch to restore this student into.");

      await db.student.update({ where: { id }, data: { archived: false, batchId: targetBatchId } });
    } else {
      await db.student.update({ where: { id }, data: { archived: true } });
    }

    revalidatePath("/students");
    revalidatePath("/students/archived");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/**
 * Flips a student between the regular monthly-fee track and the one-off model
 * test track, resetting whichever fee no longer applies.
 */
export async function toggleModelTest(id: number, batchId?: number): Promise<ActionResult<{ isModelTest: boolean }>> {
  await apiPermission("students", "update");

  try {
    const student = await db.student.findUnique({
      where: { id },
      include: { batch: { select: { id: true, archived: true, tuitionFee: true } } },
    });
    if (!student) return fail("Student not found.");

    const targetBatchId = batchId ?? student.batchId;
    if (!targetBatchId) return fail("An active batch must be selected.");

    const batch = await db.batch.findUnique({ where: { id: targetBatchId } });
    if (!batch || batch.archived) return fail("An active batch must be selected.");

    const becomingModelTest = !student.isModelTest;

    await db.student.update({
      where: { id },
      data: {
        isModelTest: becomingModelTest,
        batchId: targetBatchId,
        // Model-test students have no monthly liability; regular students inherit
        // the batch fee so the dues report has something to bill against.
        monthlyFee: becomingModelTest ? "0" : String(batch.tuitionFee),
        modelTestFee: becomingModelTest ? (student.modelTestFee ?? "0") : null,
        archived: becomingModelTest ? false : student.archived,
      },
    });

    revalidatePath("/students");
    return succeed({ isModelTest: becomingModelTest });
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

const nameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(40, "At most 40 characters")
  // The SMS gateway and the printed roll sheets are Latin-only, so a Bengali
  // name here silently breaks both downstream.
  .regex(/^[^ঀ-৿]+$/u, "Latin letters only");

export async function updateStudentName(id: number, name: string): Promise<ActionResult> {
  await apiPermission("students", "update");

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid name");

  try {
    await db.student.update({
      where: { id },
      data: { name: parsed.data, isNameVerified: true },
    });
    revalidatePath("/students/name-change");
    revalidatePath("/students");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteStudent(id: number): Promise<ActionResult> {
  await apiPermission("students", "delete");

  try {
    await db.student.delete({ where: { id } });
    revalidatePath("/students");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}
