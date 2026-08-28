import { MessageSquare } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { SmsDisabledBanner } from "@/components/shell/sms-disabled-banner";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ExportButton } from "@/components/ui/export-button";
import { FilterSelect } from "@/components/ui/filter-select";
import { EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatDateShort, formatNumber } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import type { SmsCategory, SmsStatus } from "@/lib/types";
import { listActiveBatches } from "@/server/queries/batches";
import { listSmsMessages } from "@/server/queries/sms";

/**
 * The SMS report: delivery statistics over a filtered slice of the log.
 *
 * Shared by the general report and the payment-scoped one — the only
 * difference is whether `lockedCategories` pins the category set, which also
 * hides the category filter that would otherwise contradict it.
 */
export async function SmsReport({
  title,
  params,
  lockedCategories,
}: {
  title: string;
  params: Record<string, string | string[] | undefined>;
  /** When set, the report covers only these categories and the filter is hidden. */
  lockedCategories?: readonly SmsCategory[];
}) {
  const { t, locale } = await getI18n();
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const from = str("from") ?? "";
  const to = str("to") ?? "";
  const chosenCategory = lockedCategories ? undefined : (str("category") as SmsCategory | undefined);

  const [result, batches] = await Promise.all([
    listSmsMessages({
      category: chosenCategory,
      categories: lockedCategories,
      status: str("status") as SmsStatus | undefined,
      batchId: str("batch") ? Number(str("batch")) : undefined,
      from: from || undefined,
      to: to || undefined,
      search: str("q"),
      page: Number(str("page") ?? 1),
    }),
    listActiveBatches(),
  ]);

  const statuses = Object.keys(t.sms.statuses) as SmsStatus[];
  const allCategories = Object.keys(t.sms.categories) as SmsCategory[];

  // Only categories that actually occur in this slice, largest first — an
  // exhaustive list of zeroes tells the reader nothing.
  const presentCategories = allCategories
    .map((category) => ({ category, count: result.categoryCounts[category] ?? 0 }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  const exportParams: Record<string, string> = lockedCategories
    ? { categories: lockedCategories.join(",") }
    : {};

  return (
    <>
      <PageHeader
        title={title}
        description={t.sms.title}
        actions={<ExportButton dataset="sms" extraParams={exportParams} />}
      />
      <SmsDisabledBanner />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t.common.total} value={formatNumber(result.total, locale)} tone="info" />
        {statuses.map((status) => (
          <StatCard
            key={status}
            label={t.sms.statuses[status]}
            value={formatNumber(result.statusCounts[status] ?? 0, locale)}
            tone={STATUS_TONE[status]}
          />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput placeholder={t.common.search} className="w-full sm:max-w-xs" />
        {lockedCategories ? null : (
          <FilterSelect
            paramName="category"
            className="w-52"
            placeholder={t.common.type}
            options={[
              { value: "", label: t.common.all },
              ...allCategories.map((category) => ({ value: category, label: t.sms.categories[category] })),
            ]}
          />
        )}
        <FilterSelect
          paramName="status"
          className="w-40"
          placeholder={t.common.status}
          options={[
            { value: "", label: t.common.all },
            ...statuses.map((status) => ({ value: status, label: t.sms.statuses[status] })),
          ]}
        />
        <FilterSelect
          paramName="batch"
          className="w-52"
          placeholder={t.students.batch}
          options={[
            { value: "", label: t.common.all },
            ...batches.map((batch) => ({
              value: String(batch.id),
              label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
            })),
          ]}
        />
        <DateRangeFilter from={from} to={to} />
      </div>

      {presentCategories.length > 0 ? (
        <section className="mb-4 rounded-[--radius-retro] border-2 border-line bg-surface p-4 retro-shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">{t.sms.byCategory}</h2>
          <div className="flex flex-wrap gap-2">
            {presentCategories.map(({ category, count }) => (
              <span
                key={category}
                className="inline-flex items-center gap-2 rounded-[--radius-retro] border-2 border-line bg-surface-2 px-3 py-1.5 text-sm"
              >
                {t.sms.categories[category]}
                <strong className="tabular-nums">{formatNumber(count, locale)}</strong>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {result.messages.length === 0 ? (
        <EmptyState icon={<MessageSquare />} title={t.sms.empty} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>{t.common.date}</TH>
                <TH>{t.common.type}</TH>
                <TH>{t.sms.recipient}</TH>
                <TH>{t.students.batch}</TH>
                <TH>{t.sms.body}</TH>
                <TH>{t.common.status}</TH>
                <TH>{t.sms.reason}</TH>
              </TR>
            </THead>
            <TBody>
              {result.messages.map((message) => (
                <TR key={message.id}>
                  <TD className="whitespace-nowrap text-muted">{formatDateShort(message.createdAt, locale)}</TD>
                  <TD>
                    <Badge variant="outline">{t.sms.categories[message.category]}</Badge>
                  </TD>
                  <TD className="whitespace-nowrap">
                    <span className="block text-sm font-medium">{message.student?.name ?? "—"}</span>
                    <span className="block text-xs tabular-nums text-muted">
                      {message.phone} · {message.recipientType}
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap text-sm text-muted">
                    {message.batch?.name ?? (message.batch ? `#${message.batch.batchNumber}` : "—")}
                  </TD>
                  <TD className="max-w-md">
                    <p className="line-clamp-2 text-xs text-muted">{message.body}</p>
                  </TD>
                  <TD>
                    <Badge variant={STATUS_TONE[message.status]}>{t.sms.statuses[message.status]}</Badge>
                  </TD>
                  <TD className="font-mono text-xs text-muted">{message.reason ?? "—"}</TD>
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

const STATUS_TONE: Record<SmsStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  sent: "success",
  queued: "info",
  pending: "warning",
  failed: "danger",
  skipped: "neutral",
};
