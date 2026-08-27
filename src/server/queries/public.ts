import "server-only";

import { db } from "@/server/db";

/** Content the public homepage renders. No auth: it is the marketing page. */
export async function getPublicHomeData() {
  const [announcements, batches, stats] = await Promise.all([
    db.announcement.findMany({
      where: { isActive: true },
      orderBy: { id: "desc" },
      take: 5,
      select: { id: true, content: true },
    }),
    db.batch.findMany({
      where: { archived: false, infoLine1: { not: null } },
      orderBy: [{ hscYear: "desc" }, { batchNumber: "asc" }],
      select: {
        id: true,
        hscYear: true,
        daysInWeek: true,
        startTime: true,
        endTime: true,
        infoLine1: true,
        infoLine2: true,
        hscYearColor: true,
        infoLine1Color: true,
        infoLine2Color: true,
      },
    }),
    Promise.all([
      db.student.count({ where: { archived: false } }),
      db.batch.count({ where: { archived: false } }),
      db.exam.count(),
    ]),
  ]);

  return {
    announcements,
    batches,
    stats: { students: stats[0], batches: stats[1], exams: stats[2] },
  };
}

/**
 * Public lookup for the student portal.
 *
 * Deliberately narrow: it matches on the roll, the student's own phone or the
 * guardian's, and returns nothing on a partial name — a portal that let anyone
 * browse the roster by typing "a" would be a privacy problem, not a feature.
 */
export async function findStudentForPortal(query: string) {
  const term = query.trim();
  if (term.length < 3) return null;

  return db.student.findFirst({
    where: {
      OR: [
        { studentUid: term },
        { phone: term },
        { parentPhone: term },
      ],
    },
    select: { id: true },
  });
}
