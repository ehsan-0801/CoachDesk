import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatDate, formatNumber, formatPercent } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { getDailyBatchDetail } from "@/server/queries/attendance";

import { DeleteDayButton } from "./delete-day-button";

export const metadata = { title: "Attendance detail" };

export default async function DailyBatchPage({
  params,
}: {
  params: Promise<{ batchId: string; date: string }>;
}) {
  const user = await requirePermission("attendance", "view");
  const { t, locale } = await getI18n();

  const { batchId, date } = await params;
  const id = Number(batchId);
  if (!Number.isInteger(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const detail = await getDailyBatchDetail(id, date);
  if (!detail.batch) notFound();

  const present = detail.students.filter((s) => s.status === "present").length;
  const absent = detail.students.filter((s) => s.status === "absent").length;
  const unmarked = detail.students.length - present - absent;

  return (
    <>
      <PageHeader
        title={detail.batch.name ?? `${t.batches.title} ${detail.batch.batchNumber}`}
        description={formatDate(date, locale)}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/attendance/daily?date=${date}`}>
                <ArrowLeft /> {t.common.back}
              </Link>
            </Button>
            {can(user, "attendance", "delete") ? <DeleteDayButton batchId={id} date={date} /> : null}
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label={t.attendance.present} value={formatNumber(present, locale)} tone="success" />
        <StatCard label={t.attendance.absent} value={formatNumber(absent, locale)} tone="danger" />
        <StatCard
          label={t.attendance.attendanceRate}
          value={formatPercent(present + absent ? (present / (present + absent)) * 100 : 0, locale)}
          tone="primary"
        />
      </div>

      {detail.students.length === 0 ? (
        <EmptyState title={t.students.empty} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH className="w-24">{t.students.studentId}</TH>
                <TH>{t.students.studentName}</TH>
                <TH>{t.common.phone}</TH>
                <TH className="text-right">{t.common.status}</TH>
              </TR>
            </THead>
            <TBody>
              {detail.students.map((student) => (
                <TR key={student.id}>
                  <TD className="font-bold tabular-nums">{student.studentUid ?? "—"}</TD>
                  <TD>
                    <Link href={`/students/${student.id}`} className="font-medium underline-offset-2 hover:underline">
                      {student.name}
                    </Link>
                  </TD>
                  <TD className="tabular-nums text-muted">{student.phone ?? "—"}</TD>
                  <TD className="text-right">
                    {student.status === "present" ? (
                      <Badge variant="success">{t.attendance.present}</Badge>
                    ) : student.status === "absent" ? (
                      <Badge variant="danger">{t.attendance.absent}</Badge>
                    ) : (
                      <Badge variant="neutral">—</Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      {unmarked > 0 ? (
        <p className="mt-3 text-xs text-muted">
          {formatNumber(unmarked, locale)} {t.attendance.noClassOnDate}
        </p>
      ) : null}
    </>
  );
}
