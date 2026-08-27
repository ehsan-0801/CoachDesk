"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, type ActionResult } from "@/lib/action-result";
import type { SmsCategory } from "@/lib/types";
import { apiPermission } from "@/server/auth";
import { db } from "@/server/db";
import { enqueueSms, isSmsEnabled } from "@/server/sms";

const templateSchema = z.object({
  isActive: z.coerce.boolean(),
  studentTemplate: z.string().trim().min(1).max(1000),
  parentTemplate: z.string().trim().max(1000).optional().nullable(),
  sendToStudent: z.coerce.boolean(),
  sendToParent: z.coerce.boolean(),
  sendToTest: z.coerce.boolean(),
  testPhone: z.string().trim().max(20).optional().nullable(),
});

export async function saveSmsTemplate(
  category: SmsCategory,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await apiPermission("sms", "update");

  const parsed = templateSchema.safeParse({
    isActive: formData.get("isActive") === "on",
    studentTemplate: formData.get("studentTemplate"),
    parentTemplate: formData.get("parentTemplate") || null,
    sendToStudent: formData.get("sendToStudent") === "on",
    sendToParent: formData.get("sendToParent") === "on",
    sendToTest: formData.get("sendToTest") === "on",
    testPhone: formData.get("testPhone") || null,
  });
  if (!parsed.success) return fail("The message body cannot be empty.");

  try {
    await db.smsTemplate.update({
      where: { category },
      data: { ...parsed.data, parentTemplate: parsed.data.parentTemplate || null, updatedById: user.id },
    });
    revalidatePath("/sms");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/** Restores a template to the shipped default wording. */
export async function resetSmsTemplate(category: SmsCategory): Promise<ActionResult> {
  const user = await apiPermission("sms", "update");
  const { DEFAULT_SMS_TEMPLATES } = await import("@/server/sms/templates");

  try {
    const defaults = DEFAULT_SMS_TEMPLATES[category];
    await db.smsTemplate.update({
      where: { category },
      data: {
        studentTemplate: defaults.student,
        parentTemplate: defaults.parent,
        updatedById: user.id,
      },
    });
    revalidatePath("/sms");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/**
 * Composes a broadcast for a whole batch.
 *
 * Like every other trigger this goes through the pipeline, so with delivery off
 * the messages are recorded as `skipped` and the operator can see exactly what
 * would have gone out.
 */
export async function queueBatchBroadcast(
  batchId: number,
  message: string,
): Promise<ActionResult<{ composed: number; queued: number; skipped: number }>> {
  const user = await apiPermission("sms", "create");
  if (!message.trim()) return fail("Write a message first.");

  try {
    const [batch, students] = await Promise.all([
      db.batch.findUnique({ where: { id: batchId }, select: { name: true, batchNumber: true } }),
      db.student.findMany({
        where: { batchId, archived: false },
        select: { id: true, name: true, studentUid: true, phone: true, parentPhone: true },
      }),
    ]);
    if (!batch) return fail("Batch not found.");
    if (!students.length) return fail("This batch has no active students.");

    const result = await enqueueSms({
      category: "batchwise",
      requestedBy: user.id,
      recipients: students.map((student) => ({
        studentId: student.id,
        batchId,
        studentPhone: student.phone,
        parentPhone: student.parentPhone,
        context: {
          student_name: student.name,
          student_id: student.studentUid,
          batch_name: batch.name ?? `Batch ${batch.batchNumber}`,
          message: message.trim(),
        },
      })),
    });

    revalidatePath("/sms/queue");
    return succeed(
      { composed: result.composed, queued: result.queued, skipped: result.skipped },
      result.reason,
    );
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteSmsMessages(ids: number[]): Promise<ActionResult> {
  await apiPermission("sms", "delete");
  if (!ids.length) return fail("Nothing selected.");

  try {
    await db.smsMessage.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/sms/queue");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/** Reports whether delivery is on, for the banner on the SMS screens. */
export async function getSmsStatus() {
  return { enabled: isSmsEnabled(), provider: process.env.SMS_PROVIDER ?? "noop" };
}
