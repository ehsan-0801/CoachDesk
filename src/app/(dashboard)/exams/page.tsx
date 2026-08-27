import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { listExams } from "@/server/queries/exams";

import { ExamsClient } from "./exams-client";

export const metadata = { title: "Exams" };

export default async function ExamsPage() {
  const user = await requirePermission("exams", "view");
  const { t } = await getI18n();
  const exams = await listExams();

  return (
    <>
      <PageHeader title={t.exams.title} description={t.exams.create} />
      <ExamsClient
        exams={exams}
        canCreate={can(user, "exams", "create")}
        canUpdate={can(user, "exams", "update")}
        canDelete={can(user, "exams", "delete")}
      />
    </>
  );
}
