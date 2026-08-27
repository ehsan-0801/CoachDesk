import { TrendingDown } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { FilterSelect } from "@/components/ui/filter-select";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatNumber } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { getDuesReport } from "@/server/queries/payments";
import { listStudentHscYears } from "@/server/queries/students";

import { DuesTable } from "./dues-table";

export const metadata = { title: "Outstanding dues" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DuesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("payments", "view");
  const { t, locale } = await getI18n();

  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const [report, batches, years] = await Promise.all([
    getDuesReport({
      batchId: str("batch") ? Number(str("batch")) : undefined,
      hscYear: str("year"),
      search: str("q"),
    }),
    listActiveBatches(),
    listStudentHscYears(),
  ]);

  return (
    <>
      <PageHeader title={t.payments.dues} description={t.payments.title} />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          label={t.payments.outstanding}
          value={formatCurrency(report.totalDue, locale)}
          icon={<TrendingDown />}
          tone="danger"
        />
        <StatCard
          label={t.students.title}
          value={formatNumber(report.studentCount, locale)}
          tone="warning"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
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
          paramName="year"
          className="w-36"
          placeholder={t.batches.hscYear}
          options={[{ value: "", label: t.common.all }, ...years.map((y) => ({ value: y, label: `HSC ${y}` }))]}
        />
      </div>

      <DuesTable
        rows={report.rows.map((row) => ({
          id: row.id,
          name: row.name,
          studentUid: row.studentUid,
          phone: row.phone,
          parentPhone: row.parentPhone,
          batchLabel: row.batchLabel,
          monthlyFee: row.monthlyFee,
          expected: row.expected,
          paid: row.paid,
          due: row.due,
          monthCount: row.monthCount,
        }))}
        totalDue={report.totalDue}
        canQueueSms={can(user, "sms", "create")}
      />
    </>
  );
}
