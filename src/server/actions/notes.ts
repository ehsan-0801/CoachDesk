"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { apiPermission } from "@/server/auth";
import { db } from "@/server/db";

const noteSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().int().min(0),
});

export async function saveNote(
  id: number | null,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await apiPermission("notes", id ? "update" : "create");

  const parsed = noteSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity") ?? 0,
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  try {
    if (id) await db.note.update({ where: { id }, data: parsed.data });
    else await db.note.create({ data: { ...parsed.data, createdById: user.id } });

    revalidatePath("/notes");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteNote(id: number): Promise<ActionResult> {
  await apiPermission("notes", "delete");

  try {
    await db.note.delete({ where: { id } });
    revalidatePath("/notes");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/**
 * Hands out copies and decrements stock in one transaction.
 *
 * Students who already have a copy are silently skipped rather than failing the
 * whole run — re-running a distribution after adding a few students is the
 * normal workflow, and it must not double-charge the inventory.
 */
export async function distributeNotes(
  noteId: number,
  studentIds: number[],
): Promise<ActionResult<{ distributed: number; skipped: number }>> {
  const user = await apiPermission("notes", "create");
  if (!studentIds.length) return fail("Select at least one student.");

  try {
    const result = await db.$transaction(async (tx) => {
      const note = await tx.note.findUnique({ where: { id: noteId } });
      if (!note) throw new Error("Note not found.");

      const existing = await tx.noteDistribution.findMany({
        where: { noteId, studentId: { in: studentIds } },
        select: { studentId: true },
      });
      const alreadyHave = new Set(existing.map((row) => row.studentId));
      const toGive = studentIds.filter((id) => !alreadyHave.has(id));

      if (toGive.length > note.quantity) {
        throw new Error(`Only ${note.quantity} copies in stock; ${toGive.length} requested.`);
      }

      if (toGive.length) {
        await tx.noteDistribution.createMany({
          data: toGive.map((studentId) => ({ noteId, studentId, distributedById: user.id })),
        });
        await tx.note.update({
          where: { id: noteId },
          data: { quantity: { decrement: toGive.length } },
        });
      }

      return { distributed: toGive.length, skipped: alreadyHave.size };
    });

    revalidatePath("/notes");
    return succeed(result);
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/** Reverses a distribution and returns the copy to stock. */
export async function revokeDistribution(id: number): Promise<ActionResult> {
  await apiPermission("notes", "delete");

  try {
    await db.$transaction(async (tx) => {
      const distribution = await tx.noteDistribution.delete({ where: { id } });
      await tx.note.update({
        where: { id: distribution.noteId },
        data: { quantity: { increment: 1 } },
      });
    });
    revalidatePath("/notes");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}
