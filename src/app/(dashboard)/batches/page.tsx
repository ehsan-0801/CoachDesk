import { Layers, Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { EmptyState } from "@/components/ui/misc";
import { SearchInput } from "@/components/ui/search-input";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatCurrency, formatDateShort, formatNumber, formatTimeRange, formatWeekdayKeys } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { listBatches, listHscYears } from "@/server/queries/batches";

import { BatchRowActions } from "./batch-actions";

export const metadata = { title: "Batches" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BatchesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("batches", "view");
  const { t, locale } = await getI18n();

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : undefined;
  const hscYear = typeof params.year === "string" ? params.year : undefined;
  const archived = (typeof params.status === "string" ? params.status : "active") as
    | "active"
    | "archived"
    | "all";

  const [batches, years] = await Promise.all([
    listBatches({ search, hscYear, archived }),
    listHscYears(),
  ]);

  const canCreate = can(user, "batches", "create");
  const canUpdate = can(user, "batches", "update");
  const canDelete = can(user, "batches", "delete");

  return (
    <>
      <PageHeader
        title={t.batches.title}
        description={t.batches.subtitle}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/batches/new">
                <Plus /> {t.batches.create}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput placeholder={t.common.search} className="w-full sm:max-w-xs" />
        <FilterSelect
          paramName="status"
          defaultValue="active"
          className="w-40"
          options={[
            { value: "active", label: t.batches.showActive },
            { value: "archived", label: t.batches.showArchived },
            { value: "all", label: t.common.all },
          ]}
        />
        <FilterSelect
          paramName="year"
          className="w-36"
          placeholder={t.batches.hscYear}
          options={[
            { value: "", label: t.common.all },
            ...years.map((year) => ({ value: year, label: `HSC ${year}` })),
          ]}
        />
      </div>

      {batches.length === 0 ? (
        <EmptyState
          icon={<Layers />}
          title={t.batches.empty}
          action={
            canCreate ? (
              <Button asChild size="sm">
                <Link href="/batches/new">
                  <Plus /> {t.batches.create}
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH className="w-16">#</TH>
                <TH>{t.batches.batchName}</TH>
                <TH>{t.batches.schedule}</TH>
                <TH>{t.batches.startingDate}</TH>
                <TH className="text-right">{t.batches.tuitionFee}</TH>
                <TH className="text-right">{t.batches.studentCount}</TH>
                <TH className="w-12" />
              </TR>
            </THead>
            <TBody>
              {batches.map((batch) => (
                <TR key={batch.id}>
                  <TD className="font-bold tabular-nums">{formatNumber(batch.batchNumber, locale)}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{batch.name ?? `${t.batches.title} ${batch.batchNumber}`}</span>
                      {batch.archived ? <Badge variant="neutral">{t.common.archived}</Badge> : null}
                    </div>
                    <span className="text-xs text-muted">HSC {formatNumber(batch.hscYear, locale)}</span>
                  </TD>
                  <TD className="whitespace-nowrap">
                    <span className="block text-sm">{formatWeekdayKeys(batch.daysInWeek, locale)}</span>
                    <span className="block text-xs text-muted">
                      {formatTimeRange(batch.startTime, batch.endTime, locale)}
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap text-muted">{formatDateShort(batch.startingDate, locale)}</TD>
                  <TD className="text-right font-medium tabular-nums">
                    {formatCurrency(batch.tuitionFee, locale)}
                  </TD>
                  <TD className="text-right">
                    <Badge variant={batch.studentCount > 0 ? "secondary" : "neutral"}>
                      {formatNumber(batch.studentCount, locale)}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <BatchRowActions
                      batch={{ id: batch.id, archived: batch.archived, studentCount: batch.studentCount }}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </>
  );
}
