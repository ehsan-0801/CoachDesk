import { ClipboardList } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatNumber, formatPercent } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { getExamBatchOptions, getExamResults, listExams } from "@/server/queries/exams";

import { ResultFilters } from "./result-filters";

export const metadata = { title: "Exam results" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ExamResultsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("exams", "view");
  const { t, locale } = await getI18n();

  const params = await searchParams;
  const exams = await listExams();

  const examId = typeof params.exam === "string" ? params.exam : String(exams[0]?.id ?? "");
  const batchOptions = examId ? await getExamBatchOptions(Number(examId)) : [];
  const batchId = typeof params.batch === "string" ? params.batch : "";

  const data = examId
    ? await getExamResults(Number(examId), batchId ? Number(batchId) : undefined)
    : null;

  return (
    <>
      <PageHeader
        title={t.exams.results}
        description={data?.exam.examName}
        actions={
          <ResultFilters
            exams={exams.map((exam) => ({ id: exam.id, label: exam.examName }))}
            batches={batchOptions}
            examId={examId}
            batchId={batchId}
          />
        }
      />

      {!data || data.results.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title={t.portal.noResults} />
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t.students.title} value={formatNumber(data.stats.count, locale)} tone="secondary" />
            <StatCard
              label={t.exams.highest}
              value={`${formatNumber(data.stats.highest, locale)} / ${formatNumber(data.exam.totalMarks, locale)}`}
              tone="success"
            />
            <StatCard
              label={t.exams.average}
              value={formatNumber(Math.round(data.stats.average), locale)}
              tone="primary"
            />
            <StatCard
              label={t.attendance.attendanceRate}
              value={formatPercent(
                data.exam.totalMarks ? (data.stats.average / data.exam.totalMarks) * 100 : 0,
                locale,
              )}
              tone="neutral"
            />
          </div>

          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH className="w-16">{t.exams.rank}</TH>
                  <TH className="w-20">{t.students.studentId}</TH>
                  <TH>{t.students.studentName}</TH>
                  <TH>{t.students.batch}</TH>
                  <TH className="text-right">{t.exams.mcqMarks}</TH>
                  <TH className="text-right">{t.exams.cqMarks}</TH>
                  <TH className="text-right">{t.common.total}</TH>
                </TR>
              </THead>
              <TBody>
                {data.results.map((result) => (
                  <TR key={result.id}>
                    <TD>
                      <Badge variant={result.rank <= 3 ? "primary" : "neutral"}>
                        {formatNumber(result.rank, locale)}
                      </Badge>
                    </TD>
                    <TD className="font-bold tabular-nums">{result.student.studentUid ?? "—"}</TD>
                    <TD>
                      <Link
                        href={`/students/${result.student.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {result.student.name}
                      </Link>
                    </TD>
                    <TD className="text-sm text-muted">
                      {result.batch?.name ?? (result.batch ? `#${result.batch.batchNumber}` : "—")}
                    </TD>
                    <TD className="text-right tabular-nums">{formatNumber(result.mcqMarks ?? 0, locale)}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(result.cqMarks ?? 0, locale)}</TD>
                    <TD className="text-right font-bold tabular-nums">
                      {formatNumber(result.totalMarks, locale)} / {formatNumber(data.exam.totalMarks, locale)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </>
      )}
    </>
  );
}
