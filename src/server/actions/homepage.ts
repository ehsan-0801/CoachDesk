"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, type ActionResult } from "@/lib/action-result";
import { apiPermission } from "@/server/auth";
import { db } from "@/server/db";

const announcementSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  isActive: z.coerce.boolean(),
});

export async function saveAnnouncement(
  id: number | null,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await apiPermission("homepage", id ? "update" : "create");

  const parsed = announcementSchema.safeParse({
    content: formData.get("content"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return fail("Write the announcement text first.");

  try {
    if (id) await db.announcement.update({ where: { id }, data: parsed.data });
    else await db.announcement.create({ data: { ...parsed.data, createdById: user.id } });

    revalidatePath("/homepage/announcements");
    revalidatePath("/");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function toggleAnnouncement(id: number, isActive: boolean): Promise<ActionResult> {
  await apiPermission("homepage", "update");

  try {
    await db.announcement.update({ where: { id }, data: { isActive } });
    revalidatePath("/homepage/announcements");
    revalidatePath("/");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteAnnouncement(id: number): Promise<ActionResult> {
  await apiPermission("homepage", "delete");

  try {
    await db.announcement.delete({ where: { id } });
    revalidatePath("/homepage/announcements");
    revalidatePath("/");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}
