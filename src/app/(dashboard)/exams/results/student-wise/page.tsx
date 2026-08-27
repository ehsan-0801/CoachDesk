import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { listExamAssignments } from "@/server/queries/exams";

import { StudentWiseClient } from "./student-wise-client";

export const metadata = { title: "Enter results by student" };

export default async function StudentWiseResultsPage() {
  await requirePermission("exams", "create");
  const { t } = await getI18n();
  const assignments = await listExamAssignments();

  return (
    <>
      <PageHeader title={t.exams.resultsByStudent} description={t.exams.results} />
      <StudentWiseClient
        exams={assignments.map((assignment) => ({
          id: assignment.examId,
          batchId: assignment.batchId,
          label: `${assignment.exam.examName} — ${assignment.batch.name ?? `#${assignment.batch.batchNumber}`}`,
          mcqMarks: assignment.exam.mcqMarks,
          cqMarks: assignment.exam.cqMarks,
        }))}
      />
    </>
  );
}
