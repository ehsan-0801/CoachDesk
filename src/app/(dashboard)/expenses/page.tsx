import { Plus, Receipt } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatCurrency, formatDateShort, formatNumber } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { isoDate, startOfMonth } from "@/lib/utils";
import { requirePermission } from "@/server/auth";
import { listExpenseTypes, listExpenses } from "@/server/queries/expenses";

import { DateRangeFilter } from "../payments/date-range-filter";
import { ExpenseRowActions } from "./expense-row-actions";

export const metadata = { title: "Expenses" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("expenses", "view");
  const { t, locale } = await getI18n();

  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const from = str("from") ?? isoDate(startOfMonth());
  const to = str("to") ?? isoDate();

  const [result, types] = await Promise.all([
    listExpenses({
      from,
      to,
      expenseTypeId: str("type") ? Number(str("type")) : undefined,
      page: Number(str("page") ?? 1),
    }),
    listExpenseTypes(),
  ]);

  return (
    <>
      <PageHeader
        title={t.expenses.title}
        description={t.expenses.record}
        actions={
          can(user, "expenses", "create") ? (
            <Button asChild>
              <Link href="/expenses/new">
                <Plus /> {t.expenses.record}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t.expenses.totalSpent}
          value={formatCurrency(result.grandTotal, locale)}
          hint={`${formatNumber(result.total, locale)} ×`}
          icon={<Receipt />}
          tone="danger"
        />
        {result.byType.slice(0, 2).map((row) => (
          <StatCard
            key={row.expenseTypeId}
            label={row.name}
            value={formatCurrency(row.total, locale)}
            tone="neutral"
          />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DateRangeFilter from={from} to={to} />
        <FilterSelect
          paramName="type"
          className="w-48"
          placeholder={t.expenses.expenseType}
          options={[
            { value: "", label: t.common.all },
            ...types.map((type) => ({ value: String(type.id), label: type.name })),
          ]}
        />
      </div>

      {result.expenses.length === 0 ? (
        <EmptyState icon={<Receipt />} title={t.expenses.empty} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>{t.common.date}</TH>
                <TH>{t.expenses.expenseType}</TH>
                <TH>{t.common.description}</TH>
                <TH className="text-right">{t.expenses.unitsObtained}</TH>
                <TH className="text-right">{t.common.amount}</TH>
                <TH className="w-12" />
              </TR>
            </THead>
            <TBody>
              {result.expenses.map((expense) => (
                <TR key={expense.id}>
                  <TD className="whitespace-nowrap">{formatDateShort(expense.expenseDate, locale)}</TD>
                  <TD>
                    <Badge variant="outline">{expense.expenseType.name}</Badge>
                  </TD>
                  <TD className="max-w-64 truncate text-muted">
                    {expense.description ?? "—"}
                    {expense.note ? (
                      <span className="block text-xs">{expense.note.name}</span>
                    ) : null}
                  </TD>
                  <TD className="text-right tabular-nums text-muted">
                    {expense.quantity ? formatNumber(expense.quantity, locale) : "—"}
                  </TD>
                  <TD className="text-right font-bold tabular-nums">
                    {formatCurrency(expense.amount, locale)}
                  </TD>
                  <TD className="text-right">
                    <ExpenseRowActions
                      id={expense.id}
                      label={expense.expenseType.name}
                      canDelete={can(user, "expenses", "delete")}
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
