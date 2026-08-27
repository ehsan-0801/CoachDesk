import { CalendarX } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatNumber, formatPercent, formatTimeRange, formatWeekdayKeys } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { isoDate } from "@/lib/utils";
import { requirePermission } from "@/server/auth";
import { getDailySummary } from "@/server/queries/attendance";

import { DatePicker } from "./date-picker";

export const metadata = { title: "Daily attendance" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DailyAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("attendance", "view");
  const { t, locale } = await getI18n();

  const params = await searchParams;
  const date = typeof params.date === "string" ? params.date : isoDate();
  const batches = await getDailySummary(date);

  const totals = batches.reduce(
    (acc, batch) => {
      if (!batch.taken) return acc;
      acc.present += batch.present;
      acc.absent += batch.absent;
      return acc;
    },
    { present: 0, absent: 0 },
  );
  const totalMarked = totals.present + totals.absent;

  return (
    <>
      <PageHeader
        title={t.attendance.dailySummary}
        description={formatDate(date, locale)}
        actions={<DatePicker date={date} />}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t.attendance.present}
          value={formatNumber(totals.present, locale)}
          tone="success"
        />
        <StatCard label={t.attendance.absent} value={formatNumber(totals.absent, locale)} tone="danger" />
        <StatCard
          label={t.attendance.attendanceRate}
          value={formatPercent(totalMarked ? (totals.present / totalMarked) * 100 : 0, locale)}
          tone="primary"
        />
      </div>

      {batches.length === 0 ? (
        <EmptyState icon={<CalendarX />} title={t.batches.empty} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {batches.map((batch) => {
            const marked = batch.present + batch.absent;
            const rate = marked ? (batch.present / marked) * 100 : 0;

            return (
              <Link key={batch.id} href={`/attendance/daily/${batch.id}/${date}`} className="block">
                <Card className="retro-lift h-full">
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-bold">
                          {batch.name ?? `${t.batches.title} ${batch.batchNumber}`}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {formatWeekdayKeys(batch.daysInWeek, locale)} ·{" "}
                          {formatTimeRange(batch.startTime, batch.endTime, locale)}
                        </p>
                      </div>
                      {batch.taken ? (
                        <Badge variant="success">{formatPercent(rate, locale)}</Badge>
                      ) : (
                        <Badge variant="neutral">{t.attendance.noClassOnDate}</Badge>
                      )}
                    </div>

                    <div className="h-3 overflow-hidden rounded-full border-2 border-line bg-surface-2">
                      <div className="h-full bg-success" style={{ width: `${rate}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-success">
                        {t.attendance.present} <b className="tabular-nums">{formatNumber(batch.present, locale)}</b>
                      </span>
                      <span className="text-danger">
                        {t.attendance.absent} <b className="tabular-nums">{formatNumber(batch.absent, locale)}</b>
                      </span>
                      <span className="text-muted">
                        {t.common.total} <b className="tabular-nums">{formatNumber(batch.enrolled, locale)}</b>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
