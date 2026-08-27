import { PageHeader } from "@/components/shell/page-header";
import { FilterSelect } from "@/components/ui/filter-select";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { listStudentHscYears, listStudents } from "@/server/queries/students";

import { StudentTable } from "../student-table";
import { toStudentRows } from "../to-rows";

export const metadata = { title: "Archived students" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ArchivedStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("students", "view");
  const { t } = await getI18n();
  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const [result, batches, years] = await Promise.all([
    listStudents({
      scope: "archived",
      search: str("q"),
      hscYear: str("year"),
      page: Number(str("page") ?? 1),
    }),
    listActiveBatches(),
    listStudentHscYears(),
  ]);

  const batchOptions = batches.map((batch) => ({
    id: batch.id,
    label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
  }));

  return (
    <>
      <PageHeader title={t.nav.studentArchived} description={t.students.subtitle} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput placeholder={t.students.searchPlaceholder} className="w-full sm:max-w-xs" />
        <FilterSelect
          paramName="year"
          className="w-36"
          placeholder={t.batches.hscYear}
          options={[{ value: "", label: t.common.all }, ...years.map((y) => ({ value: y, label: `HSC ${y}` }))]}
        />
      </div>

      <StudentTable
        students={toStudentRows(result.students, t)}
        activeBatches={batchOptions}
        canUpdate={can(user, "students", "update")}
        canDelete={can(user, "students", "delete")}
        showDues={false}
      />

      <Pagination page={result.page} pageCount={result.pageCount} total={result.total} />
    </>
  );
}
