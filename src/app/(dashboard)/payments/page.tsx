import { Plus, Wallet } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatCurrency, formatDateShort, formatMonthYear, formatNumber } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { isoDate, startOfMonth } from "@/lib/utils";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { listPaymentTypeOptions, listPayments } from "@/server/queries/payments";

import { DateRangeFilter } from "./date-range-filter";
import { PaymentRowActions } from "./payment-row-actions";

export const metadata = { title: "Payments" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("payments", "view");
  const { t, locale } = await getI18n();

  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const from = str("from") ?? isoDate(startOfMonth());
  const to = str("to") ?? isoDate();

  const [result, batches, types] = await Promise.all([
    listPayments({
      from,
      to,
      batchId: str("batch") ? Number(str("batch")) : undefined,
      paymentType: str("type"),
      method: str("method"),
      search: str("q"),
      page: Number(str("page") ?? 1),
    }),
    listActiveBatches(),
    listPaymentTypeOptions(),
  ]);

  return (
    <>
      <PageHeader
        title={t.payments.report}
        description={t.payments.title}
        actions={
          can(user, "payments", "create") ? (
            <Button asChild>
              <Link href="/payments/new">
                <Plus /> {t.payments.record}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t.payments.collected}
          value={formatCurrency(result.grandTotal, locale)}
          hint={`${formatNumber(result.total, locale)} ${t.payments.title.toLowerCase()}`}
          icon={<Wallet />}
          tone="success"
        />
        {result.byType.slice(0, 2).map((row) => (
          <StatCard
            key={row.paymentType}
            label={row.paymentType}
            value={formatCurrency(row.total, locale)}
            hint={`${formatNumber(row.count, locale)} ×`}
            tone="neutral"
          />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DateRangeFilter from={from} to={to} />
        <SearchInput placeholder={t.students.searchPlaceholder} className="w-full sm:max-w-xs" />
        <FilterSelect
          paramName="batch"
          className="w-48"
          placeholder={t.students.batch}
          options={[
            { value: "", label: t.common.all },
            ...batches.map((b) => ({
              value: String(b.id),
              label: b.name ?? `${t.batches.title} ${b.batchNumber}`,
            })),
          ]}
        />
        <FilterSelect
          paramName="type"
          className="w-44"
          placeholder={t.payments.paymentType}
          options={[{ value: "", label: t.common.all }, ...types.map((type) => ({ value: type, label: type }))]}
        />
      </div>

      {result.payments.length === 0 ? (
        <EmptyState icon={<Wallet />} title={t.payments.empty} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>{t.common.date}</TH>
                <TH>{t.students.studentName}</TH>
                <TH>{t.payments.paymentType}</TH>
                <TH>{t.payments.paymentMonth}</TH>
                <TH>{t.payments.paymentMethod}</TH>
                <TH className="text-right">{t.common.amount}</TH>
                <TH className="w-12" />
              </TR>
            </THead>
            <TBody>
              {result.payments.map((payment) => (
                <TR key={payment.id}>
                  <TD className="whitespace-nowrap">{formatDateShort(payment.paymentDate, locale)}</TD>
                  <TD>
                    <Link
                      href={`/students/${payment.student.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {payment.student.name}
                    </Link>
                    <span className="block text-xs text-muted">
                      {payment.student.studentUid ?? "—"}
                      {payment.batch ? ` · ${payment.batch.name ?? `#${payment.batch.batchNumber}`}` : ""}
                    </span>
                  </TD>
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
          </Table>
        </TableWrap>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} total={result.total} />
    </>
  );
}
