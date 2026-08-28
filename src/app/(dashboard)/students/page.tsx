import { Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { FilterSelect } from "@/components/ui/filter-select";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { listStudentHscYears, listStudents } from "@/server/queries/students";

import { StudentTable } from "./student-table";
import { toStudentRows } from "./to-rows";

export const metadata = { title: "Students" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("students", "view");
  const { t } = await getI18n();
  const params = await searchParams;

  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const [result, batches, years] = await Promise.all([
    listStudents({
      search: str("q"),
      batchId: str("batch") ? Number(str("batch")) : undefined,
      hscYear: str("year"),
      gender: str("gender") as "male" | "female" | undefined,
      page: Number(str("page") ?? 1),
      withDues: true,
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
      <PageHeader
        title={t.students.title}
        description={t.students.subtitle}
        actions={
          <>
            <ExportButton dataset="students" />
            {can(user, "students", "create") ? (
              <Button asChild>
                <Link href="/students/admission">
                  <Plus /> {t.students.admission}
                </Link>
              </Button>
            ) : null}
          </>
        }
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
        <FilterSelect
          paramName="year"
          className="w-36"
          placeholder={t.batches.hscYear}
          options={[{ value: "", label: t.common.all }, ...years.map((y) => ({ value: y, label: `HSC ${y}` }))]}
        />
        <FilterSelect
          paramName="gender"
          className="w-32"
          placeholder={t.students.gender}
          options={[
            { value: "", label: t.common.all },
            { value: "male", label: t.students.male },
            { value: "female", label: t.students.female },
          ]}
        />
      </div>

      <StudentTable
        students={toStudentRows(result.students, t)}
        activeBatches={batchOptions}
        canUpdate={can(user, "students", "update")}
        canDelete={can(user, "students", "delete")}
      />

      <Pagination page={result.page} pageCount={result.pageCount} total={result.total} />
    </>
  );
}
