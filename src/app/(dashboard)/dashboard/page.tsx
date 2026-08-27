import {
  CalendarCheck,
  GraduationCap,
  Layers,
  TrendingDown,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatCurrency, formatDateShort, formatNumber, formatPercent } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { getDashboardData } from "@/server/queries/dashboard";

import { CollectionChart } from "./collection-chart";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePermission("dashboard", "view");
  const { t, locale } = await getI18n();
  const data = await getDashboardData();

  const attendanceRate =
    data.attendanceToday.total > 0
      ? (data.attendanceToday.present / data.attendanceToday.total) * 100
      : 0;

  const quickActions = [
    { href: "/attendance/take", label: t.nav.attendanceTake, module: "attendance" as const, action: "create" as const },
    { href: "/payments/new", label: t.nav.paymentNew, module: "payments" as const, action: "create" as const },
    { href: "/students/admission", label: t.nav.studentAdmission, module: "students" as const, action: "create" as const },
    { href: "/exams/results/batch-wise", label: t.nav.examResultBatch, module: "exams" as const, action: "create" as const },
  ].filter((item) => can(user, item.module, item.action));

  return (
    <>
      <PageHeader
        title={`${t.auth.welcomeBack}, ${user.name.split(" ")[0]}`}
        description={t.dashboard.subtitle}
        actions={
          quickActions.length ? (
            <div className="flex flex-wrap gap-2">
              {quickActions.slice(0, 2).map((action) => (
                <Button key={action.href} asChild size="sm" variant="outline">
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ))}
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.dashboard.totalStudents}
          value={formatNumber(data.totalStudents, locale)}
          hint={`${t.dashboard.male} ${formatNumber(data.male, locale)} · ${t.dashboard.female} ${formatNumber(data.female, locale)}`}
          icon={<GraduationCap />}
          tone="secondary"
        />
        <StatCard
          label={t.dashboard.activeBatches}
          value={formatNumber(data.activeBatches, locale)}
          icon={<Layers />}
          tone="primary"
        />
        <StatCard
          label={t.dashboard.collectedThisMonth}
          value={formatCurrency(data.collectedThisMonth, locale)}
          hint={`${formatNumber(data.paymentsThisMonth, locale)} ${t.payments.title.toLowerCase()}`}
          icon={<Wallet />}
          tone="success"
        />
        <StatCard
          label={t.dashboard.outstandingDues}
          value={formatCurrency(data.outstandingDues, locale)}
          icon={<TrendingDown />}
          tone="danger"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.dashboard.monthlyCollection}</CardTitle>
          </CardHeader>
          <CardContent className="pl-1 pr-3">
            <CollectionChart data={data.collectionSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.todayAttendance}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.attendanceToday.total === 0 ? (
              <EmptyState
                icon={<CalendarCheck />}
                title={t.dashboard.noClassesToday}
                className="border-0 bg-transparent py-6"
              />
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold tabular-nums">{formatPercent(attendanceRate, locale)}</p>
                  <p className="text-xs uppercase tracking-wide text-muted">{t.attendance.attendanceRate}</p>
                </div>
                <div
                  className="flex h-4 overflow-hidden rounded-full border-2 border-line bg-surface-2"
                  role="img"
                  aria-label={`${t.dashboard.presentToday} ${data.attendanceToday.present}, ${t.dashboard.absentToday} ${data.attendanceToday.absent}`}
                >
                  <div className="bg-success" style={{ width: `${attendanceRate}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-[--radius-retro] border-2 border-line bg-success/25 py-2">
                    <p className="text-lg font-bold tabular-nums">{formatNumber(data.attendanceToday.present, locale)}</p>
                    <p className="text-xs text-muted">{t.dashboard.presentToday}</p>
                  </div>
                  <div className="rounded-[--radius-retro] border-2 border-line bg-danger/25 py-2">
                    <p className="text-lg font-bold tabular-nums">{formatNumber(data.attendanceToday.absent, locale)}</p>
                    <p className="text-xs text-muted">{t.dashboard.absentToday}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.dashboard.recentPayments}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentPayments.length === 0 ? (
              <EmptyState title={t.payments.empty} className="m-4 border-dashed" />
            ) : (
              <TableWrap className="rounded-none border-0 shadow-none">
                <Table>
                  <THead>
                    <TR>
                      <TH>{t.students.studentName}</TH>
                      <TH>{t.payments.paymentType}</TH>
                      <TH className="text-right">{t.common.amount}</TH>
                      <TH>{t.common.date}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.recentPayments.map((payment) => (
                      <TR key={payment.id}>
                        <TD>
                          <span className="block font-medium">{payment.studentName}</span>
                          <span className="block text-xs text-muted">
                            {payment.studentUid ?? "—"}
                            {payment.batchLabel ? ` · ${payment.batchLabel}` : ""}
                          </span>
                        </TD>
                        <TD>
                          <Badge variant="outline">{payment.paymentType}</Badge>
                        </TD>
                        <TD className="text-right font-bold tabular-nums">
                          {formatCurrency(payment.amount, locale)}
                        </TD>
                        <TD className="whitespace-nowrap text-muted">
                          {formatDateShort(payment.paymentDate, locale)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.studentsByYear}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.studentsByYear.length === 0 ? (
                <p className="text-sm text-muted">{t.common.noResults}</p>
              ) : (
                data.studentsByYear.map((row) => (
                  <div key={row.year} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-bold">HSC {formatNumber(row.year, locale)}</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <Badge variant="secondary">{formatNumber(row.male, locale)}</Badge>
                      <Badge variant="accent">{formatNumber(row.female, locale)}</Badge>
                      <span className="w-8 text-right font-bold tabular-nums text-ink">
                        {formatNumber(row.total, locale)}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.studentsByBatch}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.studentsByBatch.length === 0 ? (
                <p className="text-sm text-muted">{t.common.noResults}</p>
              ) : (
                data.studentsByBatch.map((row) => (
                  <div key={row.batchId} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{row.label}</span>
                      <span className="font-bold tabular-nums">{formatNumber(row.count, locale)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full border-2 border-line bg-surface-2">
                      <div
                        className="h-full bg-secondary"
                        style={{
                          width: `${(row.count / Math.max(...data.studentsByBatch.map((b) => b.count))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
