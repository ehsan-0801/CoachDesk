"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { apiPermission } from "@/server/auth";
import { db } from "@/server/db";

function utcDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const expenseSchema = z.object({
  expenseTypeId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  quantity: z.coerce.number().int().min(0).optional().nullable(),
  noteId: z.coerce.number().int().positive().optional().nullable(),
  noteType: z.string().trim().max(80).optional().nullable(),
  printType: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function readForm(formData: FormData) {
  return expenseSchema.safeParse({
    expenseTypeId: formData.get("expenseTypeId"),
    amount: formData.get("amount"),
    quantity: formData.get("quantity") || null,
    noteId: formData.get("noteId") || null,
    noteType: formData.get("noteType") || null,
    printType: formData.get("printType") || null,
    description: formData.get("description") || null,
    expenseDate: formData.get("expenseDate"),
  });
}

/**
 * Records a spend. When it is linked to a note, the units obtained are added to
 * that note's stock in the same transaction — printing is how inventory grows,
 * so the two must never drift apart.
 */
export async function saveExpense(
  id: number | null,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await apiPermission("expenses", id ? "update" : "create");

  const parsed = readForm(formData);
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  const data = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      const previous = id ? await tx.expense.findUnique({ where: { id } }) : null;

      const payload = {
        expenseTypeId: data.expenseTypeId,
        amount: String(data.amount),
        quantity: data.quantity ?? null,
        noteId: data.noteId ?? null,
        noteType: data.noteType || null,
        printType: data.printType || null,
        description: data.description || null,
        expenseDate: utcDate(data.expenseDate),
        recordedById: user.id,
      };

      if (id) await tx.expense.update({ where: { id }, data: payload });
      else await tx.expense.create({ data: payload });

      // Roll back the stock the previous version added, then apply the new one,
      // so editing an expense cannot leave phantom copies behind.
      if (previous?.noteId && previous.quantity) {
        await tx.note.update({
          where: { id: previous.noteId },
          data: { quantity: { decrement: previous.quantity } },
        });
      }
      if (data.noteId && data.quantity) {
        await tx.note.update({
          where: { id: data.noteId },
          data: { quantity: { increment: data.quantity } },
        });
      }
    });

    revalidatePath("/expenses");
    revalidatePath("/notes");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteExpense(id: number): Promise<ActionResult> {
  await apiPermission("expenses", "delete");

  try {
    await db.$transaction(async (tx) => {
      const expense = await tx.expense.delete({ where: { id } });
      if (expense.noteId && expense.quantity) {
        await tx.note.update({
          where: { id: expense.noteId },
          // Stock can never go below zero, even if copies were handed out first.
          data: { quantity: { decrement: Math.min(expense.quantity, await currentStock(tx, expense.noteId)) } },
        });
      }
    });

    revalidatePath("/expenses");
    revalidatePath("/notes");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

async function currentStock(tx: { note: { findUnique: (args: { where: { id: number } }) => Promise<{ quantity: number } | null> } }, noteId: number) {
  const note = await tx.note.findUnique({ where: { id: noteId } });
  return note?.quantity ?? 0;
}

export async function saveExpenseType(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await apiPermission("expenses", "create");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Name is required.", { name: "Name is required" });

  try {
    await db.expenseType.create({ data: { name } });
    revalidatePath("/expenses/types");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteExpenseType(id: number): Promise<ActionResult> {
  await apiPermission("expenses", "delete");

  try {
    const inUse = await db.expense.count({ where: { expenseTypeId: id } });
    if (inUse > 0) return fail("This type is used by existing expenses.");

    await db.expenseType.delete({ where: { id } });
    revalidatePath("/expenses/types");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}
