import "server-only";

import type { Prisma } from "@/lib/types";
import { db } from "@/server/db";
import { computeMonthlyDues } from "@/server/services/dues";

export const STUDENTS_PER_PAGE = 25;

export interface StudentListFilters {
  search?: string;
  batchId?: number;
  hscYear?: string;
  /** `active` hides archived students; `archived` shows only them. */
  scope?: "active" | "archived" | "all";
  gender?: "male" | "female";
  /** Restricts to students missing a guardian phone number. */
  missingParentPhone?: boolean;
  modelTestOnly?: boolean;
  page?: number;
  perPage?: number;
  /** Adds outstanding monthly dues to each row. Costs one extra query. */
  withDues?: boolean;
}

function buildWhere(filters: StudentListFilters): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {};

  if (filters.scope === "archived") where.archived = true;
  else if (filters.scope !== "all") where.archived = false;

  if (filters.batchId) where.batchId = filters.batchId;
  if (filters.hscYear) where.hscYear = filters.hscYear;
  if (filters.gender) where.gender = filters.gender;
  if (filters.modelTestOnly) where.isModelTest = true;

  if (filters.missingParentPhone) {
    where.OR = [{ parentPhone: null }, { parentPhone: "" }];
  }

  if (filters.search) {
    const term = filters.search.trim();
    where.AND = [
      {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { studentUid: { contains: term, mode: "insensitive" } },
          { phone: { contains: term } },
          { parentPhone: { contains: term } },
          { collegeRoll: { contains: term } },
        ],
      },
    ];
  }

  return where;
}

export async function listStudents(filters: StudentListFilters = {}) {
  const perPage = filters.perPage ?? STUDENTS_PER_PAGE;
  const page = Math.max(1, filters.page ?? 1);
  const where = buildWhere(filters);

  const [total, rows] = await Promise.all([
    db.student.count({ where }),
    db.student.findMany({
      where,
      orderBy: [{ studentUid: "asc" }, { id: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        batch: { select: { id: true, name: true, batchNumber: true, startingDate: true, archived: true } },
        college: { select: { id: true, name: true, shortName: true } },
      },
    }),
  ]);

  let dues = new Map<number, { due: number; isNew: boolean }>();
  if (filters.withDues && rows.length) {
    dues = await computeMonthlyDues(
      rows
        .filter((s) => !s.isModelTest)
        .map((s) => ({
          id: s.id,
          monthlyFee: s.monthlyFee,
          admissionDate: s.admissionDate,
          batchStartingDate: s.batch?.startingDate ?? null,
        })),
    );
  }

  return {
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
    students: rows.map((student) => ({
      ...student,
      admissionFee: Number(student.admissionFee),
      monthlyFee: Number(student.monthlyFee),
      modelTestFee: student.modelTestFee === null ? null : Number(student.modelTestFee),
      due: dues.get(student.id)?.due ?? 0,
    })),
  };
}

export async function getStudent(id: number) {
  const student = await db.student.findUnique({
    where: { id },
    include: {
      batch: true,
      college: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!student) return null;

  return {
    ...student,
    admissionFee: Number(student.admissionFee),
    monthlyFee: Number(student.monthlyFee),
    modelTestFee: student.modelTestFee === null ? null : Number(student.modelTestFee),
  };
}

/** Lightweight rows for pickers and typeaheads. */
export async function searchStudentOptions(term: string, options: { includeArchived?: boolean; limit?: number } = {}) {
  const trimmed = term.trim();
  if (trimmed.length < 1) return [];

  return db.student.findMany({
    where: {
      ...(options.includeArchived ? {} : { archived: false }),
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { studentUid: { contains: trimmed, mode: "insensitive" } },
        { phone: { contains: trimmed } },
      ],
    },
    orderBy: { studentUid: "asc" },
    take: options.limit ?? 20,
    select: {
      id: true,
      name: true,
      studentUid: true,
      phone: true,
      archived: true,
      isModelTest: true,
      batch: { select: { id: true, name: true, batchNumber: true } },
    },
  });
}

export async function listStudentsByBatch(batchId: number, options: { includeArchived?: boolean } = {}) {
  return db.student.findMany({
    where: { batchId, ...(options.includeArchived ? {} : { archived: false }) },
    orderBy: [{ studentUid: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      studentUid: true,
      phone: true,
      parentPhone: true,
      admissionDate: true,
      isModelTest: true,
      monthlyFee: true,
    },
  });
}

/**
 * Suggests the next student roll for an HSC year.
 *
 * Rolls are `YY` + a three-digit serial. Serials whose first digit is 8 or 9 are
 * reserved for manually assigned special IDs, so they are excluded from the
 * "highest so far" scan — the legacy system used the same convention.
 */
export async function nextStudentUid(hscYear: string): Promise<string> {
  const prefix = hscYear.slice(-2);
  const rows = await db.student.findMany({
    where: { studentUid: { startsWith: prefix } },
    select: { studentUid: true },
  });

  let highest = 0;
  for (const row of rows) {
    const serial = row.studentUid?.slice(prefix.length);
    if (!serial || !/^\d+$/.test(serial)) continue;
    if (serial[0] === "8" || serial[0] === "9") continue;
    highest = Math.max(highest, Number(serial));
  }

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

export async function listStudentHscYears() {
  const rows = await db.student.findMany({
    distinct: ["hscYear"],
    select: { hscYear: true },
    orderBy: { hscYear: "desc" },
  });
  return rows.map((r) => r.hscYear);
}

export type StudentListItem = Awaited<ReturnType<typeof listStudents>>["students"][number];
export type StudentOption = Awaited<ReturnType<typeof searchStudentOptions>>[number];
