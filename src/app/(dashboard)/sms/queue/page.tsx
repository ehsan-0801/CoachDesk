import { MessageSquare } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { SmsDisabledBanner } from "@/components/shell/sms-disabled-banner";
import { Badge } from "@/components/ui/badge";
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
import { requirePermission } from "@/server/auth";
import { listSmsMessages } from "@/server/queries/sms";

export const metadata = { title: "SMS queue" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_TONE: Record<SmsStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  sent: "success",
  queued: "info",
  pending: "warning",
  failed: "danger",
  skipped: "neutral",
};

export default async function SmsQueuePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("sms", "view");
  const { t, locale } = await getI18n();

  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const result = await listSmsMessages({
    category: str("category") as SmsCategory | undefined,
    status: str("status") as SmsStatus | undefined,
    search: str("q"),
    page: Number(str("page") ?? 1),
  });

  const statuses = Object.keys(t.sms.statuses) as SmsStatus[];
  const categories = Object.keys(t.sms.categories) as SmsCategory[];

  return (
    <>
      <PageHeader
        title={t.sms.queue}
        description={t.sms.title}
        actions={<ExportButton dataset="sms" />}
      />
      <SmsDisabledBanner />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
        <FilterSelect
          paramName="category"
          className="w-52"
          placeholder={t.common.type}
          options={[
            { value: "", label: t.common.all },
            ...categories.map((category) => ({ value: category, label: t.sms.categories[category] })),
          ]}
        />
        <FilterSelect
          paramName="status"
          className="w-40"
          placeholder={t.common.status}
          options={[
            { value: "", label: t.common.all },
            ...statuses.map((status) => ({ value: status, label: t.sms.statuses[status] })),
          ]}
        />
      </div>

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
