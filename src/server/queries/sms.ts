import "server-only";

import type { Prisma, SmsCategory, SmsStatus } from "@/lib/types";
import { db } from "@/server/db";
import { DEFAULT_SMS_TEMPLATES, SMS_PLACEHOLDERS } from "@/server/sms/templates";

export const SMS_PER_PAGE = 30;

export async function listSmsTemplates() {
  const templates = await db.smsTemplate.findMany({ orderBy: { id: "asc" } });
  return templates.map((template) => ({
    ...template,
    placeholders: SMS_PLACEHOLDERS[template.category] ?? [],
    defaultStudentTemplate: DEFAULT_SMS_TEMPLATES[template.category]?.student ?? "",
    defaultParentTemplate: DEFAULT_SMS_TEMPLATES[template.category]?.parent ?? "",
  }));
}

export interface SmsMessageFilters {
  category?: SmsCategory;
  /** Restricts to a set of categories — how the payment report scopes itself. */
  categories?: readonly SmsCategory[];
  status?: SmsStatus;
  batchId?: number;
  /** Inclusive `YYYY-MM-DD` bounds on the created date. */
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  /** Overrides the page size — the CSV export asks for the whole filtered set. */
  perPage?: number;
}

export async function listSmsMessages(filters: SmsMessageFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? SMS_PER_PAGE;

  const where: Prisma.SmsMessageWhereInput = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.categories?.length ? { category: { in: [...filters.categories] } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.batchId ? { batchId: filters.batchId } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            // `createdAt` is a Timestamptz, not a @db.Date like paymentDate, so
            // the upper bound has to reach the end of the day or that day's own
            // messages drop out. The day is a *UTC* day, matching how every
            // other date filter here is anchored; the app has no timezone
            // setting to key it off. If one is added, key these bounds to it.
            ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
            ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { phone: { contains: filters.search } },
            { body: { contains: filters.search, mode: "insensitive" } },
            { student: { name: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, rows, byStatus, byCategory] = await Promise.all([
    db.smsMessage.count({ where }),
    db.smsMessage.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        student: { select: { id: true, name: true, studentUid: true } },
        batch: { select: { id: true, name: true, batchNumber: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    }),
    // Both breakdowns share the table's `where`, so the totals on screen always
    // describe the rows on screen rather than the whole table.
    db.smsMessage.groupBy({ by: ["status"], where, _count: { _all: true } }),
    db.smsMessage.groupBy({ by: ["category"], where, _count: { _all: true } }),
  ]);

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
    messages: rows,
    statusCounts: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])) as Record<
      SmsStatus,
      number | undefined
    >,
    categoryCounts: Object.fromEntries(byCategory.map((row) => [row.category, row._count._all])) as Record<
      SmsCategory,
      number | undefined
    >,
  };
}
