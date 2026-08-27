import { CalendarX } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatNumber, formatPercent, toLocaleDigits } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { getMonthlySummary } from "@/server/queries/attendance";
import { listActiveBatches } from "@/server/queries/batches";
import { cn } from "@/lib/utils";

import { MonthFilters } from "./month-filters";

export const metadata = { title: "Monthly attendance" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MonthlyAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("attendance", "view");
  const { t, locale } = await getI18n();

  const params = await searchParams;
  const batches = await listActiveBatches();

  const now = new Date();
  const batchId = typeof params.batch === "string" ? params.batch : String(batches[0]?.id ?? "");
  const year = Number(typeof params.year === "string" ? params.year : now.getFullYear());
  const month = Number(typeof params.month === "string" ? params.month : now.getMonth() + 1);

  const summary = batchId
    ? await getMonthlySummary(Number(batchId), year, month)
    : { batch: null, classDates: [], rows: [] };

  const batchOptions = batches.map((batch) => ({
    id: batch.id,
    label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
  }));

  return (
    <>
      <PageHeader
        title={t.attendance.monthlySummary}
        description={
          summary.classDates.length
            ? `${t.attendance.classesHeld}: ${formatNumber(summary.classDates.length, locale)}`
            : undefined
        }
        actions={<MonthFilters batches={batchOptions} batchId={batchId} year={year} month={month} />}
      />

      {summary.classDates.length === 0 ? (
        <EmptyState icon={<CalendarX />} title={t.attendance.noClassOnDate} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH className="sticky left-0 z-10 bg-surface-2">{t.students.studentName}</TH>
                {summary.classDates.map((date) => (
                  <TH key={date.toISOString()} className="w-9 text-center">
                    {toLocaleDigits(date.getUTCDate(), locale)}
                  </TH>
                ))}
                <TH className="text-right">{t.attendance.present}</TH>
                <TH className="text-right">{t.attendance.attendanceRate}</TH>
              </TR>
            </THead>
            <TBody>
              {summary.rows.map((row) => (
                <TR key={row.id}>
                  <TD className="sticky left-0 z-10 whitespace-nowrap bg-surface">
                    <span className="block font-medium">{row.name}</span>
                    <span className="block text-xs text-muted">{row.studentUid ?? "—"}</span>
                  </TD>
                  {row.cells.map((cell, index) => (
                    <TD key={index} className="p-1 text-center">
                      <span
                        aria-label={
                          cell === "present"
                            ? t.attendance.present
                            : cell === "absent"
                              ? t.attendance.absent
                              : t.attendance.notStarted
                        }
                        className={cn(
                          "mx-auto grid size-6 place-items-center rounded-[0.3rem] border-2 border-line text-[10px] font-bold",
                          cell === "present" && "bg-success text-success-ink",
                          cell === "absent" && "bg-danger text-danger-ink",
                          cell === "not_started" && "retro-stripes bg-surface-2 text-transparent",
                        )}
                      >
                        {cell === "present" ? "P" : cell === "absent" ? "A" : "·"}
                      </span>
                    </TD>
                  ))}
                  <TD className="text-right font-bold tabular-nums">
                    {formatNumber(row.present, locale)}
                  </TD>
                  <TD className="text-right">
                    <Badge
                      variant={row.rate >= 80 ? "success" : row.rate >= 60 ? "warning" : "danger"}
                    >
                      {formatPercent(row.rate, locale)}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </>
  );
}
