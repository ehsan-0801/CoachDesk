import { PhoneOff } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { FilterSelect } from "@/components/ui/filter-select";
import { EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { listStudents } from "@/server/queries/students";

import { StudentTable } from "../student-table";
import { toStudentRows } from "../to-rows";

export const metadata = { title: "Missing guardian number" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NoParentPhonePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("students", "view");
  const { t } = await getI18n();
  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const [result, batches] = await Promise.all([
    listStudents({
      missingParentPhone: true,
      search: str("q"),
      batchId: str("batch") ? Number(str("batch")) : undefined,
      page: Number(str("page") ?? 1),
    }),
    listActiveBatches(),
  ]);

  const batchOptions = batches.map((batch) => ({
    id: batch.id,
    label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
  }));

  return (
    <>
      <PageHeader
        title={t.students.noParentPhone}
        description="These students cannot receive guardian SMS until a number is added."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput placeholder={t.students.searchPlaceholder} className="w-full sm:max-w-xs" />
        <FilterSelect
          paramName="batch"
          className="w-52"
          placeholder={t.students.batch}
          options={[
            { value: "", label: t.common.all },
            ...batchOptions.map((b) => ({ value: String(b.id), label: b.label })),
          ]}
        />
      </div>

      {result.total === 0 ? (
        <EmptyState icon={<PhoneOff />} title={t.common.noResults} />
      ) : (
        <>
          <StudentTable
            students={toStudentRows(result.students, t)}
            activeBatches={batchOptions}
            canUpdate={can(user, "students", "update")}
            canDelete={false}
            showDues={false}
          />
          <Pagination page={result.page} pageCount={result.pageCount} total={result.total} />
        </>
      )}
    </>
  );
}
