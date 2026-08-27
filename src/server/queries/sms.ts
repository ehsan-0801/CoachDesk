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

export async function listSmsMessages(filters: {
  category?: SmsCategory;
  status?: SmsStatus;
  search?: string;
  page?: number;
} = {}) {
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.SmsMessageWhereInput = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
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

  const [total, rows, byStatus] = await Promise.all([
    db.smsMessage.count({ where }),
    db.smsMessage.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * SMS_PER_PAGE,
      take: SMS_PER_PAGE,
      include: {
        student: { select: { id: true, name: true, studentUid: true } },
        batch: { select: { id: true, name: true, batchNumber: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    }),
    db.smsMessage.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / SMS_PER_PAGE)),
    messages: rows,
    statusCounts: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])) as Record<
      SmsStatus,
      number | undefined
    >,
  };
}
