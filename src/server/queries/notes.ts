import "server-only";

import { db } from "@/server/db";

export async function listNotes() {
  const notes = await db.note.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { distributions: true } } },
  });
  return notes.map((note) => ({ ...note, distributedCount: note._count.distributions }));
}

/** Roster for a distribution run, flagged with who already has a copy. */
export async function getDistributionSheet(noteId: number, batchId: number) {
  const [note, students, distributed] = await Promise.all([
    db.note.findUnique({ where: { id: noteId } }),
    db.student.findMany({
      where: { batchId, archived: false },
      orderBy: [{ studentUid: "asc" }],
      select: { id: true, name: true, studentUid: true },
    }),
    db.noteDistribution.findMany({ where: { noteId }, select: { studentId: true } }),
  ]);

  const alreadyHave = new Set(distributed.map((row) => row.studentId));

  return {
    note,
    students: students.map((student) => ({ ...student, alreadyHas: alreadyHave.has(student.id) })),
  };
}

export async function listDistributions(noteId: number) {
  return db.noteDistribution.findMany({
    where: { noteId },
    orderBy: { distributedAt: "desc" },
    include: {
      student: { select: { id: true, name: true, studentUid: true, batch: { select: { name: true, batchNumber: true } } } },
    },
  });
}
