import type { Dictionary } from "@/lib/i18n";
import type { StudentListItem } from "@/server/queries/students";

import type { StudentRow } from "./student-table";

/**
 * Flattens the query result into the plain, serialisable shape the client table
 * expects. Dates become ISO strings so nothing non-serialisable crosses the
 * server/client boundary.
 */
export function toStudentRows(students: StudentListItem[], t: Dictionary): StudentRow[] {
  return students.map((student) => ({
    id: student.id,
    studentUid: student.studentUid,
    name: student.name,
    phone: student.phone,
    parentPhone: student.parentPhone,
    hscYear: student.hscYear,
    gender: student.gender,
    admissionDate: student.admissionDate.toISOString().slice(0, 10),
    monthlyFee: student.monthlyFee,
    archived: student.archived,
    isModelTest: student.isModelTest,
    due: student.due,
    batchLabel: student.batch
      ? (student.batch.name ?? `${t.batches.title} ${student.batch.batchNumber}`)
      : null,
    collegeLabel: student.college?.shortName ?? student.college?.name ?? null,
  }));
}
