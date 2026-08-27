import { PageHeader } from "@/components/shell/page-header";
import { SimpleCrud } from "@/components/ui/simple-crud";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { deleteCollege, saveCollege } from "@/server/actions/colleges";
import { requirePermission } from "@/server/auth";
import { listColleges } from "@/server/queries/colleges";

export const metadata = { title: "Colleges" };

export default async function CollegesPage() {
  const user = await requirePermission("colleges", "view");
  const { t } = await getI18n();
  const colleges = await listColleges();

  return (
    <>
      <PageHeader title={t.colleges.title} description={t.students.subtitle} />
      <SimpleCrud
        rows={colleges.map((college) => ({
          id: college.id,
          name: college.name,
          secondary: college.shortName,
          usageCount: college.studentCount,
        }))}
        createAction={saveCollege}
        deleteAction={deleteCollege}
        canCreate={can(user, "colleges", "create")}
        canDelete={can(user, "colleges", "delete")}
        secondaryLabel={t.colleges.shortName}
        labels={{
          nameLabel: t.colleges.collegeName,
          addLabel: t.common.add,
          emptyLabel: t.colleges.empty,
          usageLabel: t.colleges.studentCount,
        }}
      />
    </>
  );
}
