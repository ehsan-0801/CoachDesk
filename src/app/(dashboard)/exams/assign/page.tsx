import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { isoDate } from "@/lib/utils";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { listExamAssignments, listExams } from "@/server/queries/exams";

import { AssignClient } from "./assign-client";

export const metadata = { title: "Assign exams" };

export default async function AssignExamPage() {
  const user = await requirePermission("exams", "create");
  const { t } = await getI18n();

  const [exams, batches, assignments] = await Promise.all([
    listExams(),
    listActiveBatches(),
    listExamAssignments(),
  ]);

  return (
    <>
      <PageHeader title={t.exams.assign} description={t.exams.assignedList} />
      <AssignClient
        today={isoDate()}
        canCreate={can(user, "exams", "create")}
        canDelete={can(user, "exams", "delete")}
        exams={exams.map((exam) => ({
          id: exam.id,
          label: `${exam.examName}${exam.subjectName ? ` — ${exam.subjectName}` : ""}`,
        }))}
        batches={batches.map((batch) => ({
          id: batch.id,
          label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
        }))}
        assignments={assignments.map((assignment) => ({
          id: assignment.id,
          examId: assignment.examId,
          examName: assignment.exam.examName,
          subjectName: assignment.exam.subjectName,
          batchLabel: assignment.batch.name ?? `${t.batches.title} ${assignment.batch.batchNumber}`,
          batchArchived: assignment.batch.archived,
          examDate: assignment.examDate.toISOString().slice(0, 10),
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          totalMarks: assignment.totalMarks,
          resultCount: assignment.resultCount,
        }))}
      />
    </>
  );
}
