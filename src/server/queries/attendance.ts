import "server-only";

import { db } from "@/server/db";

export type AttendanceCell = "present" | "absent" | "not_started";

function utcDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Roster for the attendance sheet, pre-filled with anything already recorded. */
export async function getAttendanceSheet(batchId: number, date: string) {
  const day = utcDate(date);

  const [batch, students, existing, classHeld] = await Promise.all([
    db.batch.findUnique({ where: { id: batchId } }),
    db.student.findMany({
      where: { batchId, archived: false },
      orderBy: [{ studentUid: "asc" }, { name: "asc" }],
      select: { id: true, name: true, studentUid: true, phone: true, parentPhone: true, admissionDate: true },
    }),
    db.attendance.findMany({
      where: { batchId, attendanceDate: day },
      select: { studentId: true, status: true },
    }),
    db.classHeld.findUnique({ where: { batchId_classDate: { batchId, classDate: day } } }),
  ]);

  const statusByStudent = new Map(existing.map((row) => [row.studentId, row.status]));

  return {
    batch,
    alreadyTaken: Boolean(classHeld),
    students: students
      // Nobody can be marked for a class held before they enrolled.
      .filter((student) => student.admissionDate <= day)
      .map((student) => ({
        id: student.id,
        name: student.name,
        studentUid: student.studentUid,
        phone: student.phone,
        // Default a fresh sheet to "present": marking the few absentees is
        // faster than ticking every student who showed up.
        status: statusByStudent.get(student.id) ?? ("present" as const),
      })),
  };
}

/** Per-batch present/absent counts for one day, across all active batches. */
export async function getDailySummary(date: string) {
  const day = utcDate(date);

  const [batches, attendance, classesHeld] = await Promise.all([
    db.batch.findMany({
      where: { archived: false },
      orderBy: { batchNumber: "asc" },
      include: { _count: { select: { students: { where: { archived: false } } } } },
    }),
    db.attendance.groupBy({
      by: ["batchId", "status"],
      where: { attendanceDate: day },
      _count: { _all: true },
    }),
    db.classHeld.findMany({ where: { classDate: day }, select: { batchId: true } }),
  ]);

  const heldBatchIds = new Set(classesHeld.map((c) => c.batchId));

  return batches.map((batch) => {
    const present = attendance.find((a) => a.batchId === batch.id && a.status === "present")?._count._all ?? 0;
    const absent = attendance.find((a) => a.batchId === batch.id && a.status === "absent")?._count._all ?? 0;
    return {
      id: batch.id,
      name: batch.name,
      batchNumber: batch.batchNumber,
      daysInWeek: batch.daysInWeek,
      startTime: batch.startTime,
      endTime: batch.endTime,
      enrolled: batch._count.students,
      present,
      absent,
      // No class held is different from a class where everyone was absent.
      taken: heldBatchIds.has(batch.id),
    };
  });
}

export async function getDailyBatchDetail(batchId: number, date: string) {
  const day = utcDate(date);

  const [batch, students, attendance] = await Promise.all([
    db.batch.findUnique({ where: { id: batchId } }),
    db.student.findMany({
      where: { batchId, archived: false },
      orderBy: [{ studentUid: "asc" }],
      select: { id: true, name: true, studentUid: true, phone: true, parentPhone: true },
    }),
    db.attendance.findMany({ where: { batchId, attendanceDate: day }, select: { studentId: true, status: true } }),
  ]);

  const byStudent = new Map(attendance.map((row) => [row.studentId, row.status]));

  return {
    batch,
    students: students.map((student) => ({
      ...student,
      status: byStudent.get(student.id) ?? null,
    })),
  };
}

/**
 * Month grid: one column per class actually held, one row per student.
 *
 * Cells before a student's enrolment read `not_started` rather than `absent`,
 * so a late joiner's attendance rate is not dragged down by classes that
 * happened before they existed in the batch.
 */
export async function getMonthlySummary(batchId: number, year: number, month: number) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));

  const [batch, classesHeld, students] = await Promise.all([
    db.batch.findUnique({ where: { id: batchId } }),
    db.classHeld.findMany({
      where: { batchId, classDate: { gte: monthStart, lte: monthEnd } },
      orderBy: { classDate: "asc" },
      select: { classDate: true },
    }),
    db.student.findMany({
      where: { batchId, archived: false },
      orderBy: [{ studentUid: "asc" }],
      select: { id: true, name: true, studentUid: true, admissionDate: true },
    }),
  ]);

  if (!batch || !classesHeld.length) {
    return { batch, classDates: [], rows: [] };
  }

  const attendance = await db.attendance.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      attendanceDate: { gte: monthStart, lte: monthEnd },
    },
    select: { studentId: true, attendanceDate: true, status: true },
  });

  const key = (studentId: number, date: Date) => `${studentId}:${date.toISOString().slice(0, 10)}`;
  const byKey = new Map(attendance.map((row) => [key(row.studentId, row.attendanceDate), row.status]));

  const classDates = classesHeld.map((c) => c.classDate);
  const batchStart = batch.startingDate;

  const rows = students.map((student) => {
    const effectiveStart = student.admissionDate > batchStart ? student.admissionDate : batchStart;
    let present = 0;
    let absent = 0;

    const cells: AttendanceCell[] = classDates.map((date) => {
      if (date < effectiveStart) return "not_started";
      const status = byKey.get(key(student.id, date));
      if (status === "present") {
        present += 1;
        return "present";
      }
      // A student on the roster with no record for a class that was held was
      // not there — the sheet records every student every time.
      absent += 1;
      return "absent";
    });

    return {
      id: student.id,
      name: student.name,
      studentUid: student.studentUid,
      cells,
      present,
      absent,
      rate: present + absent > 0 ? (present / (present + absent)) * 100 : 0,
    };
  });

  return { batch, classDates, rows: rows.sort((a, b) => a.rate - b.rate) };
}

/** Dates a batch actually held class in, for the date picker. */
export async function getClassDates(batchId: number, from: string, to: string) {
  const rows = await db.classHeld.findMany({
    where: { batchId, classDate: { gte: utcDate(from), lte: utcDate(to) } },
    orderBy: { classDate: "asc" },
    select: { classDate: true },
  });
  return rows.map((row) => row.classDate.toISOString().slice(0, 10));
}
