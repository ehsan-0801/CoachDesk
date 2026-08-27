"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { WEEKDAY_KEYS } from "@/lib/i18n/config";
import { apiPermission } from "@/server/auth";
import { db } from "@/server/db";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM");

const batchSchema = z.object({
  batchNumber: z.coerce.number().int().min(1),
  name: z.string().trim().max(120).optional().nullable(),
  hscYear: z.string().trim().min(4).max(8),
  daysInWeek: z.array(z.enum(WEEKDAY_KEYS)).min(1, "Pick at least one class day"),
  startTime: timeSchema,
  endTime: timeSchema,
  startingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.string().trim().max(60).optional().nullable(),
  tuitionFee: z.coerce.number().int().min(0),
  admissionFee: z.coerce.number().int().min(0),
});

/** `@db.Date` columns compare by day; building at UTC midnight keeps the stored
 *  day the same no matter what timezone the server runs in. */
function toDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function parseForm(formData: FormData) {
  return batchSchema.safeParse({
    batchNumber: formData.get("batchNumber"),
    name: formData.get("name") || null,
    hscYear: formData.get("hscYear"),
    daysInWeek: formData.getAll("daysInWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    startingDate: formData.get("startingDate"),
    duration: formData.get("duration") || null,
    tuitionFee: formData.get("tuitionFee") || 0,
    admissionFee: formData.get("admissionFee") || 0,
  });
}

export async function createBatch(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  await apiPermission("batches", "create");

  const parsed = parseForm(formData);
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  try {
    const batch = await db.batch.create({
      data: {
        ...parsed.data,
        startingDate: toDateOnly(parsed.data.startingDate),
      },
      select: { id: true },
    });
    revalidatePath("/batches");
    return succeed({ id: batch.id });
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function updateBatch(
  id: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await apiPermission("batches", "update");

  const parsed = parseForm(formData);
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  try {
    await db.batch.update({
      where: { id },
      data: { ...parsed.data, startingDate: toDateOnly(parsed.data.startingDate) },
    });
    revalidatePath("/batches");
    revalidatePath(`/batches/${id}`);
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/**
 * Archiving a batch archives its students too — a student cannot sensibly stay
 * "active" in a batch that has ended, and the legacy system leaving them behind
 * is what produced ghost rows in every report.
 */
export async function setBatchArchived(id: number, archived: boolean): Promise<ActionResult> {
  await apiPermission("batches", "update");

  try {
    await db.$transaction([
      db.batch.update({ where: { id }, data: { archived } }),
      db.student.updateMany({ where: { batchId: id }, data: { archived } }),
    ]);
    revalidatePath("/batches");
    revalidatePath("/students");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteBatch(id: number): Promise<ActionResult> {
  await apiPermission("batches", "delete");

  try {
    const studentCount = await db.student.count({ where: { batchId: id } });
    if (studentCount > 0) {
      // Deleting would orphan attendance, payments and results. Archiving keeps
      // the history intact and is what the user almost always means.
      return fail("This batch still has students. Archive it instead of deleting.");
    }
    await db.batch.delete({ where: { id } });
    revalidatePath("/batches");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/** Public-site showcase copy, edited from the homepage module. */
export async function updateBatchShowcase(
  id: number,
  data: {
    infoLine1: string | null;
    infoLine2: string | null;
    hscYearColor: string | null;
    infoLine1Color: string | null;
    infoLine2Color: string | null;
  },
): Promise<ActionResult> {
  await apiPermission("homepage", "update");

  try {
    await db.batch.update({ where: { id }, data });
    revalidatePath("/homepage/batch-info");
    revalidatePath("/");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}
