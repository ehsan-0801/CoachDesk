import { Wallet } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { TBody, TD, TFoot, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { isoDate } from "@/lib/utils";
import { requirePermission } from "@/server/auth";
import { getDayCollection } from "@/server/queries/payments";

import { DatePicker } from "../../attendance/daily/date-picker";
import { PaymentRowActions } from "../payment-row-actions";

export const metadata = { title: "Today's collection" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TodayCollectionPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("payments", "view");
  const { t, locale } = await getI18n();

  const params = await searchParams;
  const date = typeof params.date === "string" ? params.date : isoDate();
  const collection = await getDayCollection(date);

  return (
    <>
      <PageHeader
        title={t.payments.todayCollection}
        description={formatDate(date, locale)}
        actions={<DatePicker date={date} />}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.payments.collected}
          value={formatCurrency(collection.total, locale)}
          icon={<Wallet />}
          tone="success"
        />
        <StatCard
          label={t.payments.uniqueStudents}
          value={formatNumber(collection.uniqueStudents, locale)}
          tone="secondary"
        />
        {collection.byType.slice(0, 2).map((row) => (
          <StatCard
            key={row.paymentType}
            label={row.paymentType}
            value={formatCurrency(row.total, locale)}
            tone="neutral"
          />
        ))}
      </div>

      {collection.payments.length === 0 ? (
        <EmptyState icon={<Wallet />} title={t.payments.empty} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH className="w-20">{t.students.studentId}</TH>
                <TH>{t.students.studentName}</TH>
                <TH>{t.payments.paymentType}</TH>
                <TH>{t.payments.paymentMethod}</TH>
                <TH>{t.common.actions}</TH>
                <TH className="text-right">{t.common.amount}</TH>
                <TH className="w-12" />
              </TR>
            </THead>
            <TBody>
              {collection.payments.map((payment) => (
                <TR key={payment.id}>
                  <TD className="font-bold tabular-nums">{payment.student.studentUid ?? "—"}</TD>
                  <TD>
                    <Link
                      href={`/students/${payment.student.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {payment.student.name}
                    </Link>
                    <span className="block text-xs text-muted">
                      {payment.batch?.name ?? (payment.batch ? `#${payment.batch.batchNumber}` : "—")}
                    </span>
                  </TD>
                  <TD>
                    <Badge variant="outline">{payment.paymentType}</Badge>
                  </TD>
                  <TD className="capitalize text-muted">{payment.method}</TD>
                  <TD className="text-xs text-muted">{payment.recordedBy?.name ?? "—"}</TD>
                  <TD className="text-right font-bold tabular-nums">
                    {formatCurrency(payment.amount, locale)}
                  </TD>
                  <TD className="text-right">
                    <PaymentRowActions
                      canUpdate={can(user, "payments", "update")}
                      canDelete={can(user, "payments", "delete")}
                      payment={{
                        id: payment.id,
                        amount: payment.amount,
                        paymentDate: payment.paymentDate.toISOString().slice(0, 10),
                        method: payment.method,
                        note: payment.note,
                        studentName: payment.student.name,
                      }}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
            <TFoot>
              <TR>
                <TD colSpan={5} className="text-right">
                  {t.common.total}
                </TD>
                <TD className="text-right tabular-nums">{formatCurrency(collection.total, locale)}</TD>
                <TD />
              </TR>
            </TFoot>
          </Table>
        </TableWrap>
      )}
    </>
  );
}
