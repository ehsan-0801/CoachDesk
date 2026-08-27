import "server-only";

import { db } from "@/server/db";

export interface BatchListFilters {
  search?: string;
  hscYear?: string;
  archived?: "active" | "archived" | "all";
}

export async function listBatches(filters: BatchListFilters = {}) {
  const archived =
    filters.archived === "archived" ? true : filters.archived === "all" ? undefined : false;

  const batches = await db.batch.findMany({
    where: {
      ...(archived === undefined ? {} : { archived }),
      ...(filters.hscYear ? { hscYear: filters.hscYear } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              // A numeric search should also match the batch number.
              ...(Number.isInteger(Number(filters.search))
                ? [{ batchNumber: Number(filters.search) }]
                : []),
            ],
          }
        : {}),
    },
    orderBy: [{ archived: "asc" }, { batchNumber: "desc" }],
    include: {
      _count: { select: { students: { where: { archived: false } } } },
    },
  });

  return batches.map((batch) => ({
    ...batch,
    tuitionFee: batch.tuitionFee,
    studentCount: batch._count.students,
  }));
}

export async function getBatch(id: number) {
  return db.batch.findUnique({
    where: { id },
    include: { _count: { select: { students: { where: { archived: false } } } } },
  });
}

/** Batches a user can currently enrol or record against. */
export async function listActiveBatches() {
  return db.batch.findMany({
    where: { archived: false },
    orderBy: { batchNumber: "asc" },
    select: {
      id: true,
      batchNumber: true,
      name: true,
      hscYear: true,
      daysInWeek: true,
      startTime: true,
      endTime: true,
      startingDate: true,
      tuitionFee: true,
      admissionFee: true,
    },
  });
}

export async function listHscYears() {
  const rows = await db.batch.findMany({
    distinct: ["hscYear"],
    select: { hscYear: true },
    orderBy: { hscYear: "desc" },
  });
  return rows.map((row) => row.hscYear);
}

export async function nextBatchNumber() {
  const highest = await db.batch.findFirst({ orderBy: { batchNumber: "desc" }, select: { batchNumber: true } });
  return (highest?.batchNumber ?? 0) + 1;
}

export type BatchListItem = Awaited<ReturnType<typeof listBatches>>[number];
export type ActiveBatch = Awaited<ReturnType<typeof listActiveBatches>>[number];
