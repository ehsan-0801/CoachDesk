import { SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatTimeRange,
  formatWeekdayKeys,
} from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getStudentProfile } from "@/server/queries/student-profile";
import { findStudentForPortal } from "@/server/queries/public";

import { PortalSearch } from "./portal-search";

export const metadata = { title: "Student portal" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PortalPage({ searchParams }: { searchParams: SearchParams }) {
  const { t, locale } = await getI18n();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";

  const match = query ? await findStudentForPortal(query) : null;
  const profile = match ? await getStudentProfile(match.id) : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t.portal.title}</h1>
      <p className="mt-1 text-muted">{t.portal.subtitle}</p>

      <div className="mt-6">
        <PortalSearch initial={query} />
      </div>

      {query && !profile ? (
        <EmptyState className="mt-8" icon={<SearchX />} title={t.portal.notFound} />
      ) : null}

      {profile ? (
        <div className="mt-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{profile.student.name}</CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                <Badge variant="primary">{profile.student.studentUid ?? "—"}</Badge>
                <span>HSC {formatNumber(profile.student.hscYear, locale)}</span>
                {profile.student.college ? <span>· {profile.student.college.name}</span> : null}
              </div>
            </CardHeader>
            {/* An archived student is no longer in a batch, so no schedule is shown. */}
            {!profile.student.archived && profile.student.batch ? (
              <CardContent className="text-sm">
                <p className="font-bold">
                  {profile.student.batch.name ?? `${t.batches.title} ${profile.student.batch.batchNumber}`}
                </p>
                <p className="text-muted">
                  {formatWeekdayKeys(profile.student.batch.daysInWeek, locale)} ·{" "}
                  {formatTimeRange(profile.student.batch.startTime, profile.student.batch.endTime, locale)}
                </p>
              </CardContent>
            ) : null}
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label={t.portal.classesHeld}
              value={formatNumber(profile.attendanceTotals.classes, locale)}
              tone="secondary"
            />
            <StatCard
              label={t.portal.present}
              value={formatNumber(profile.attendanceTotals.present, locale)}
              tone="success"
            />
            <StatCard
              label={t.portal.rate}
              value={formatPercent(profile.attendanceTotals.rate, locale)}
              tone="primary"
            />
          </div>

          <Tabs defaultValue="attendance">
            <TabsList>
              <TabsTrigger value="attendance">{t.portal.attendanceTab}</TabsTrigger>
              <TabsTrigger value="results">{t.portal.resultsTab}</TabsTrigger>
              <TabsTrigger value="payments">{t.portal.paymentsTab}</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance">
              {profile.attendanceByMonth.length === 0 ? (
                <EmptyState title={t.common.noResults} />
              ) : (
                <TableWrap>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{t.common.month}</TH>
                        <TH className="text-right">{t.portal.classesHeld}</TH>
                        <TH className="text-right">{t.portal.present}</TH>
                        <TH className="text-right">{t.portal.absent}</TH>
                        <TH className="text-right">{t.portal.rate}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {profile.attendanceByMonth.map((row) => (
                        <TR key={`${row.year}-${row.month}`}>
                          <TD className="font-medium">{formatMonthYear(row.month, row.year, locale)}</TD>
                          <TD className="text-right tabular-nums">{formatNumber(row.total, locale)}</TD>
                          <TD className="text-right tabular-nums text-success">
                            {formatNumber(row.present, locale)}
                          </TD>
                          <TD className="text-right tabular-nums text-danger">
                            {formatNumber(row.total - row.present, locale)}
                          </TD>
                          <TD className="text-right font-bold tabular-nums">
                            {formatPercent((row.present / row.total) * 100, locale)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              )}
            </TabsContent>

            <TabsContent value="results">
              {profile.examResults.length === 0 ? (
                <EmptyState title={t.portal.noResults} />
              ) : (
                <TableWrap>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{t.exams.examName}</TH>
                        <TH>{t.exams.examDate}</TH>
                        <TH className="text-right">{t.exams.mcqMarks}</TH>
                        <TH className="text-right">{t.exams.cqMarks}</TH>
                        <TH className="text-right">{t.common.total}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {profile.examResults.map((result) => (
                        <TR key={`${result.examId}-${String(result.absent)}`}>
                          <TD>
                            <span className="block font-medium">{result.examName}</span>
                            <span className="block text-xs text-muted">{result.subjectName ?? "—"}</span>
                          </TD>
                          <TD className="whitespace-nowrap text-muted">
                            {formatDateShort(result.examDate, locale)}
                          </TD>
                          {result.absent ? (
                            <TD colSpan={3} className="text-right">
                              <Badge variant="danger">{t.portal.absentFromExam}</Badge>
                            </TD>
                          ) : (
                            <>
                              <TD className="text-right tabular-nums">
                                {formatNumber(result.mcqMarks ?? 0, locale)}
                              </TD>
                              <TD className="text-right tabular-nums">
                                {formatNumber(result.cqMarks ?? 0, locale)}
                              </TD>
                              <TD className="text-right font-bold tabular-nums">
                                {formatNumber(result.totalMarks ?? 0, locale)} /{" "}
                                {formatNumber(result.examTotal, locale)}
                              </TD>
                            </>
                          )}
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              )}
            </TabsContent>

            <TabsContent value="payments">
              {profile.payments.length === 0 ? (
                <EmptyState title={t.portal.noPayments} />
              ) : (
                <TableWrap>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{t.common.date}</TH>
                        <TH>{t.payments.paymentType}</TH>
                        <TH>{t.payments.paymentMonth}</TH>
                        <TH className="text-right">{t.common.amount}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {profile.payments.map((payment) => (
                        <TR key={payment.id}>
                          <TD className="whitespace-nowrap">{formatDate(payment.paymentDate, locale)}</TD>
                          <TD>
                            <Badge variant="outline">{payment.paymentType}</Badge>
                          </TD>
                          <TD className="whitespace-nowrap text-muted">
                            {payment.paymentMonth && payment.paymentYear
                              ? formatMonthYear(payment.paymentMonth, payment.paymentYear, locale)
                              : "—"}
                          </TD>
                          <TD className="text-right font-bold tabular-nums">
                            {formatCurrency(payment.amount, locale)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}
