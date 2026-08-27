import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { getResultSheet, listExamsForBatch } from "@/server/queries/exams";

import { ResultSheet } from "./result-sheet";

export const metadata = { title: "Enter results by batch" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BatchResultsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("exams", "create");
  const { t } = await getI18n();

  const params = await searchParams;
  const batches = await listActiveBatches();

  const batchId = typeof params.batch === "string" ? params.batch : String(batches[0]?.id ?? "");
  const exams = batchId ? await listExamsForBatch(Number(batchId)) : [];
  const examId = typeof params.exam === "string" ? params.exam : String(exams[0]?.examId ?? "");

  const sheet = batchId && examId ? await getResultSheet(Number(batchId), Number(examId)) : null;

  return (
    <>
      <PageHeader title={t.exams.resultsByBatch} description={t.exams.results} />
      <ResultSheet
        batchId={batchId}
        examId={sheet ? examId : ""}
        maxMcq={sheet?.exam.mcqMarks ?? 0}
        maxCq={sheet?.exam.cqMarks ?? 0}
        batches={batches.map((batch) => ({
          id: batch.id,
          label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
        }))}
        exams={exams.map((exam) => ({
          id: exam.examId,
          label: `${exam.examName}${exam.subjectName ? ` — ${exam.subjectName}` : ""}`,
        }))}
        rows={sheet?.students ?? []}
      />
    </>
  );
}
