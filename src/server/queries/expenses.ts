import "server-only";

import type { Prisma } from "@/lib/types";
import { db } from "@/server/db";

export const EXPENSES_PER_PAGE = 25;

function utcDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function listExpenses(filters: {
  from?: string;
  to?: string;
  expenseTypeId?: number;
  page?: number;
  /** Overrides the page size — the CSV export asks for the whole filtered set. */
  perPage?: number;
} = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? EXPENSES_PER_PAGE;

  const where: Prisma.ExpenseWhereInput = {
    ...(filters.from || filters.to
      ? {
          expenseDate: {
            ...(filters.from ? { gte: utcDate(filters.from) } : {}),
            ...(filters.to ? { lte: utcDate(filters.to) } : {}),
          },
        }
      : {}),
    ...(filters.expenseTypeId ? { expenseTypeId: filters.expenseTypeId } : {}),
  };

  const [total, rows, byType] = await Promise.all([
    db.expense.count({ where }),
    db.expense.findMany({
      where,
      orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        expenseType: true,
        note: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    }),
    db.expense.groupBy({ by: ["expenseTypeId"], where, _sum: { amount: true } }),
  ]);

  const typeNames = await db.expenseType.findMany({
    where: { id: { in: byType.map((row) => row.expenseTypeId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(typeNames.map((row) => [row.id, row.name]));

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
    expenses: rows.map((row) => ({ ...row, amount: Number(row.amount) })),
    byType: byType
      .map((row) => ({
        expenseTypeId: row.expenseTypeId,
        name: nameById.get(row.expenseTypeId) ?? "—",
        total: Number(row._sum.amount ?? 0),
      }))
      .sort((a, b) => b.total - a.total),
    grandTotal: byType.reduce((sum, row) => sum + Number(row._sum.amount ?? 0), 0),
  };
}

export async function listExpenseTypes() {
  return db.expenseType.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { expenses: true } } },
  });
}
