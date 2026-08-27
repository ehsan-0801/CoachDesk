import { CalendarCheck, ClipboardList, Wallet } from "lucide-react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
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
} from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { updateStudent } from "@/server/actions/students";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { collegeOptions } from "@/server/queries/colleges";
import { getStudentProfile } from "@/server/queries/student-profile";

import { StudentForm } from "../student-form";

export const metadata = { title: "Student" };

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("students", "view");
  const { t, locale } = await getI18n();

  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const profile = await getStudentProfile(id);
  if (!profile) notFound();

  const { student } = profile;
  const canUpdate = can(user, "students", "update");

  const [batches, colleges] = canUpdate
    ? await Promise.all([listActiveBatches(), collegeOptions()])
    : [[], []];

  return (
    <>
      <PageHeader
        title={student.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">{student.studentUid ?? "—"}</Badge>
            <span>HSC {formatNumber(student.hscYear, locale)}</span>
            {student.batch ? (
              <span>· {student.batch.name ?? `${t.batches.title} ${student.batch.batchNumber}`}</span>
            ) : null}
            {student.isModelTest ? <Badge variant="info">{t.students.isModelTest}</Badge> : null}
            {student.archived ? <Badge variant="neutral">{t.common.archived}</Badge> : null}
          </span>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.attendance.attendanceRate}
          value={formatPercent(profile.attendanceTotals.rate, locale)}
          hint={`${formatNumber(profile.attendanceTotals.present, locale)} / ${formatNumber(profile.attendanceTotals.classes, locale)}`}
          icon={<CalendarCheck />}
          tone="secondary"
        />
        <StatCard
          label={t.payments.collected}
          value={formatCurrency(profile.totalPaid, locale)}
          icon={<Wallet />}
          tone="success"
        />
        <StatCard
          label={t.students.duesLabel}
          value={formatCurrency(profile.dues?.due ?? 0, locale)}
          hint={profile.dues?.isNew ? t.payments.newStudent : undefined}
          tone={profile.dues && profile.dues.due > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label={t.exams.results}
          value={formatNumber(profile.examResults.filter((r) => !r.absent).length, locale)}
          icon={<ClipboardList />}
          tone="primary"
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t.common.details}</TabsTrigger>
          <TabsTrigger value="attendance">{t.attendance.title}</TabsTrigger>
          <TabsTrigger value="payments">{t.payments.title}</TabsTrigger>
          <TabsTrigger value="results">{t.exams.results}</TabsTrigger>
          {canUpdate ? <TabsTrigger value="edit">{t.common.edit}</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{t.common.details}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label={t.common.phone} value={student.phone} />
              <Detail label={t.students.parentName} value={student.parentName} />
              <Detail label={t.students.parentPhone} value={student.parentPhone} />
              <Detail
                label={t.students.college}
                value={student.college?.name ?? null}
              />
              <Detail label={t.students.collegeRoll} value={student.collegeRoll} />
              <Detail label={t.students.division} value={student.division} />
              <Detail label={t.students.courseType} value={student.courseType} />
              <Detail label={t.students.admissionDate} value={formatDate(student.admissionDate, locale)} />
              <Detail label={t.students.monthlyFee} value={formatCurrency(student.monthlyFee, locale)} />
              <Detail label={t.students.admissionFee} value={formatCurrency(student.admissionFee, locale)} />
              {student.isModelTest ? (
                <Detail label={t.students.modelTestFee} value={formatCurrency(student.modelTestFee ?? 0, locale)} />
              ) : null}
              <Detail label={t.common.comment} value={student.comment} />
            </CardContent>
          </Card>
        </TabsContent>

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
                    <TH className="text-right">{t.attendance.present}</TH>
                    <TH className="text-right">{t.attendance.absent}</TH>
                    <TH className="text-right">{t.attendance.attendanceRate}</TH>
                  </TR>
                </THead>
                <TBody>
                  {profile.attendanceByMonth.map((row) => (
                    <TR key={`${row.year}-${row.month}`}>
                      <TD className="font-medium">{formatMonthYear(row.month, row.year, locale)}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(row.total, locale)}</TD>
                      <TD className="text-right tabular-nums text-success">{formatNumber(row.present, locale)}</TD>
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

        <TabsContent value="payments">
          {profile.payments.length === 0 ? (
            <EmptyState title={t.payments.empty} />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>{t.common.date}</TH>
                    <TH>{t.payments.paymentType}</TH>
                    <TH>{t.payments.paymentMonth}</TH>
                    <TH>{t.payments.paymentMethod}</TH>
                    <TH className="text-right">{t.common.amount}</TH>
                  </TR>
                </THead>
                <TBody>
                  {profile.payments.map((payment) => (
                    <TR key={payment.id}>
                      <TD className="whitespace-nowrap">{formatDateShort(payment.paymentDate, locale)}</TD>
                      <TD>
                        <Badge variant="outline">{payment.paymentType}</Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-muted">
                        {payment.paymentMonth && payment.paymentYear
                          ? formatMonthYear(payment.paymentMonth, payment.paymentYear, locale)
                          : "—"}
                      </TD>
                      <TD className="capitalize text-muted">{payment.method}</TD>
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
                    <TR key={`${result.examId}-${result.absent}`}>
                      <TD>
                        <span className="block font-medium">{result.examName}</span>
                        <span className="block text-xs text-muted">{result.subjectName ?? "—"}</span>
                      </TD>
                      <TD className="whitespace-nowrap text-muted">{formatDateShort(result.examDate, locale)}</TD>
                      {result.absent ? (
                        <TD colSpan={3} className="text-right">
                          <Badge variant="danger">{t.portal.absentFromExam}</Badge>
                        </TD>
                      ) : (
                        <>
                          <TD className="text-right tabular-nums">{formatNumber(result.mcqMarks ?? 0, locale)}</TD>
                          <TD className="text-right tabular-nums">{formatNumber(result.cqMarks ?? 0, locale)}</TD>
                          <TD className="text-right font-bold tabular-nums">
                            {formatNumber(result.totalMarks ?? 0, locale)} / {formatNumber(result.examTotal, locale)}
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

        {canUpdate ? (
          <TabsContent value="edit">
            <StudentForm
              action={updateStudent.bind(null, student.id) as never}
              submitLabel={t.common.save}
              successMessage={t.students.updated}
              redirectTo={`/students/${student.id}`}
              batches={batches.map((batch) => ({
                id: batch.id,
                label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
                hscYear: batch.hscYear,
                tuitionFee: batch.tuitionFee,
                admissionFee: batch.admissionFee,
              }))}
              colleges={colleges.map((college) => ({
                id: college.id,
                label: college.shortName ? `${college.name} (${college.shortName})` : college.name,
              }))}
              defaults={{
                studentUid: student.studentUid ?? "",
                name: student.name,
                phone: student.phone ?? "",
                parentName: student.parentName ?? "",
                parentPhone: student.parentPhone ?? "",
                collegeId: student.collegeId ? String(student.collegeId) : "",
                collegeRoll: student.collegeRoll ?? "",
                hscYear: student.hscYear,
                gender: student.gender ?? "",
                division: student.division ?? "",
                courseType: student.courseType ?? "",
                admissionDate: student.admissionDate.toISOString().slice(0, 10),
                admissionFee: student.admissionFee,
                monthlyFee: student.monthlyFee,
                modelTestFee: student.modelTestFee ?? 500,
                batchId: student.batchId ? String(student.batchId) : "",
                isModelTest: student.isModelTest,
                comment: student.comment ?? "",
              }}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  );
}
