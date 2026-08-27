"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { apiPermission } from "@/server/auth";
import { db } from "@/server/db";

const collegeSchema = z.object({
  name: z.string().trim().min(2).max(200),
  shortName: z.string().trim().max(60).optional().nullable(),
});

export async function saveCollege(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await apiPermission("colleges", "create");

  const parsed = collegeSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName") || null,
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  try {
    await db.college.create({
      data: { name: parsed.data.name, shortName: parsed.data.shortName || null },
    });
    revalidatePath("/colleges");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteCollege(id: number): Promise<ActionResult> {
  await apiPermission("colleges", "delete");

  try {
    // Students keep working with a null college, so this only warns rather than
    // blocking — but the count makes the consequence explicit first.
    const inUse = await db.student.count({ where: { collegeId: id } });
    if (inUse > 0) return fail(`${inUse} student(s) are linked to this college.`);

    await db.college.delete({ where: { id } });
    revalidatePath("/colleges");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}
