import { Wallet } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { TBody, TD, TFoot, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatCurrency, formatDateShort, formatMonthYear } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { getStudentLedger } from "@/server/queries/payments";

import { LedgerPicker } from "./ledger-client";

export const metadata = { title: "Student ledger" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LedgerPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("payments", "view");
  const { t, locale } = await getI18n();

  const params = await searchParams;
  const studentId = typeof params.student === "string" ? Number(params.student) : null;
  const ledger = studentId ? await getStudentLedger(studentId) : null;

  return (
    <>
      <PageHeader title={t.payments.ledger} description={t.payments.title} />

      <LedgerPicker
        initial={
          ledger
            ? {
                id: ledger.student.id,
                name: ledger.student.name,
                studentUid: ledger.student.studentUid,
                phone: ledger.student.phone,
                archived: ledger.student.archived,
                isModelTest: ledger.student.isModelTest,
                batchLabel:
                  ledger.student.batch?.name ??
                  (ledger.student.batch ? `#${ledger.student.batch.batchNumber}` : null),
              }
            : null
        }
      />

      {!ledger ? (
        <EmptyState icon={<Wallet />} title={t.students.searchPlaceholder} />
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label={t.payments.expected} value={formatCurrency(ledger.totals.expected, locale)} tone="neutral" />
            <StatCard label={t.payments.collected} value={formatCurrency(ledger.totals.paid, locale)} tone="success" />
            <StatCard
              label={t.payments.due}
              value={formatCurrency(ledger.totals.due, locale)}
              tone={ledger.totals.due > 0 ? "danger" : "neutral"}
            />
          </div>

          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>{t.payments.paymentMonth}</TH>
                  <TH className="text-right">{t.payments.expected}</TH>
                  <TH className="text-right">{t.payments.collected}</TH>
                  <TH className="text-right">{t.payments.due}</TH>
                  <TH className="text-right">{t.common.status}</TH>
                </TR>
              </THead>
              <TBody>
                {ledger.admission.expected > 0 ? (
                  <TR>
                    <TD className="font-medium">{t.payments.admissionFee}</TD>
                    <TD className="text-right tabular-nums text-muted">
                      {formatCurrency(ledger.admission.expected, locale)}
                    </TD>
                    <TD className="text-right tabular-nums text-success">
                      {formatCurrency(ledger.admission.paid, locale)}
                    </TD>
                    <TD className="text-right tabular-nums">{formatCurrency(ledger.admission.due, locale)}</TD>
                    <TD className="text-right">
                      <StatusBadge due={ledger.admission.due} paid={ledger.admission.paid} t={t} />
                    </TD>
                  </TR>
                ) : null}

                {ledger.monthRows.map((row) => (
                  <TR key={`${row.year}-${row.month}`}>
                    <TD className="font-medium">{formatMonthYear(row.month, row.year, locale)}</TD>
                    <TD className="text-right tabular-nums text-muted">{formatCurrency(row.expected, locale)}</TD>
                    <TD className="text-right tabular-nums text-success">{formatCurrency(row.paid, locale)}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(row.due, locale)}</TD>
                    <TD className="text-right">
                      <StatusBadge due={row.due} paid={row.paid} t={t} />
                    </TD>
                  </TR>
                ))}

                {ledger.otherPayments.map((payment) => (
                  <TR key={`other-${payment.id}`}>
                    <TD className="font-medium">
                      {payment.paymentType}
                      <span className="block text-xs text-muted">
                        {formatDateShort(payment.paymentDate, locale)}
                      </span>
                    </TD>
                    <TD className="text-right text-muted">—</TD>
                    <TD className="text-right tabular-nums text-success">
                      {formatCurrency(payment.amount, locale)}
                    </TD>
                    <TD className="text-right text-muted">—</TD>
                    <TD className="text-right">
                      <Badge variant="success">{t.payments.paid}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
              <TFoot>
                <TR>
                  <TD>{t.common.total}</TD>
                  <TD className="text-right tabular-nums">{formatCurrency(ledger.totals.expected, locale)}</TD>
                  <TD className="text-right tabular-nums">{formatCurrency(ledger.totals.paid, locale)}</TD>
                  <TD className="text-right tabular-nums">{formatCurrency(ledger.totals.due, locale)}</TD>
                  <TD />
                </TR>
              </TFoot>
            </Table>
          </TableWrap>
        </>
      )}
    </>
  );
}

function StatusBadge({ due, paid, t }: { due: number; paid: number; t: { payments: { paid: string; partial: string; due: string } } }) {
  if (due <= 0) return <Badge variant="success">{t.payments.paid}</Badge>;
  if (paid > 0) return <Badge variant="warning">{t.payments.partial}</Badge>;
  return <Badge variant="danger">{t.payments.due}</Badge>;
}
