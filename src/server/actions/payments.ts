"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { apiPermission } from "@/server/auth";
import { db } from "@/server/db";
import { enqueueSms } from "@/server/sms";
import { computeMonthlyDues } from "@/server/services/dues";

function utcDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const paymentSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  paymentType: z.string().trim().min(1),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMonth: z.coerce.number().int().min(1).max(12).optional().nullable(),
  paymentYear: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  method: z.enum(["cash", "bkash", "nagad", "rocket", "bank", "other"]),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function recordPayment(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const user = await apiPermission("payments", "create");

  const parsed = paymentSchema.safeParse({
    studentId: formData.get("studentId"),
    paymentType: formData.get("paymentType"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    paymentMonth: formData.get("paymentMonth") || null,
    paymentYear: formData.get("paymentYear") || null,
    method: formData.get("method") ?? "cash",
    note: formData.get("note") || null,
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  const data = parsed.data;

  try {
    const student = await db.student.findUnique({
      where: { id: data.studentId },
      select: { id: true, name: true, studentUid: true, phone: true, parentPhone: true, batchId: true, isModelTest: true },
    });
    if (!student) return fail("Student not found.");

    const feeType = await db.feeType.findUnique({ where: { name: data.paymentType } });
    const paymentDate = utcDate(data.paymentDate);

    const payment = await db.payment.create({
      data: {
        studentId: student.id,
        batchId: student.batchId,
        feeTypeId: feeType?.id ?? null,
        paymentType: data.paymentType,
        amount: String(data.amount),
        paymentDate,
        // Fall back to the month the money came in when none was chosen, so the
        // dues report never has an unattributable payment.
        paymentMonth: data.paymentMonth ?? paymentDate.getUTCMonth() + 1,
        paymentYear: data.paymentYear ?? paymentDate.getUTCFullYear(),
        method: data.method,
        isModelTest: feeType?.isModelTest ?? student.isModelTest,
        note: data.note || null,
        recordedById: user.id,
      },
    });

    await enqueueSms({
      category: "payment_confirmation",
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
            payment_type: data.paymentType,
            amount: data.amount,
            date: data.paymentDate,
          },
        },
      ],
    });

    revalidatePath("/payments");
    revalidatePath("/payments/today");
    revalidatePath("/payments/dues");
    return succeed({ id: payment.id });
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function updatePayment(
  id: number,
  input: { amount: number; paymentDate: string; method: string; note?: string | null },
): Promise<ActionResult> {
  await apiPermission("payments", "update");
  if (!(input.amount > 0)) return fail("Amount must be greater than zero.");

  try {
    await db.payment.update({
      where: { id },
      data: {
        amount: String(input.amount),
        paymentDate: utcDate(input.paymentDate),
        method: input.method as "cash",
        note: input.note || null,
      },
    });
    revalidatePath("/payments");
    revalidatePath("/payments/today");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deletePayment(id: number): Promise<ActionResult> {
  await apiPermission("payments", "delete");

  try {
    await db.payment.delete({ where: { id } });
    revalidatePath("/payments");
    revalidatePath("/payments/today");
    revalidatePath("/payments/dues");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/** Composes due-payment reminders for the selected students. */
export async function queueDueReminders(studentIds: number[]): Promise<ActionResult<{ composed: number }>> {
  const user = await apiPermission("sms", "create");
  if (!studentIds.length) return fail("Select at least one student.");

  try {
    const students = await db.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true, name: true, studentUid: true, phone: true, parentPhone: true,
        monthlyFee: true, admissionDate: true, batchId: true,
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
    );

    const result = await enqueueSms({
      category: "due_payment",
      requestedBy: user.id,
      recipients: students.flatMap((student) => {
        const entry = dues.get(student.id);
        if (!entry || entry.due <= 0) return [];
        return [
          {
            studentId: student.id,
            batchId: student.batchId,
            studentPhone: student.phone,
            parentPhone: student.parentPhone,
            context: {
              student_name: student.name,
              student_id: student.studentUid,
              payment_type: "মাসিক ফি",
              due_amount: entry.due,
              month_count: entry.months.length,
            },
          },
        ];
      }),
    });

    revalidatePath("/sms/queue");
    return succeed({ composed: result.composed }, result.reason);
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

const feeTypeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.coerce.number().min(0),
  isModelTest: z.coerce.boolean().default(false),
});

export async function saveFeeType(
  id: number | null,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await apiPermission("payments", id ? "update" : "create");

  const parsed = feeTypeSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount") ?? 0,
    isModelTest: formData.get("isModelTest") === "on",
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  try {
    const data = { ...parsed.data, amount: String(parsed.data.amount) };
    if (id) await db.feeType.update({ where: { id }, data });
    else await db.feeType.create({ data });

    revalidatePath("/payments/fee-types");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteFeeType(id: number): Promise<ActionResult> {
  await apiPermission("payments", "delete");

  try {
    // Payments keep a denormalised type label, so removing the fee type does not
    // damage history — but blocking the delete while it is in use avoids
    // surprising the user with a type that vanishes from the entry form.
    const inUse = await db.payment.count({ where: { feeTypeId: id } });
    if (inUse > 0) return fail("This fee type is used by existing payments. Deactivate it instead.");

    await db.feeType.delete({ where: { id } });
    revalidatePath("/payments/fee-types");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}
