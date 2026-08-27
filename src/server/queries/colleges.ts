import "server-only";

import { db } from "@/server/db";

export async function listColleges() {
  const colleges = await db.college.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: { where: { archived: false } } } } },
  });
  return colleges.map((college) => ({ ...college, studentCount: college._count.students }));
}

export async function collegeOptions() {
  return db.college.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, shortName: true },
  });
}
