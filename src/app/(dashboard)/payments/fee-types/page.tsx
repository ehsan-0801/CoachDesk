import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { listFeeTypes } from "@/server/queries/payments";

import { FeeTypesClient } from "./fee-types-client";

export const metadata = { title: "Fee types" };

export default async function FeeTypesPage() {
  const user = await requirePermission("payments", "update");
  const { t } = await getI18n();
  const feeTypes = await listFeeTypes();

  return (
    <>
      <PageHeader title={t.payments.feeTypes} description={t.payments.title} />
      <FeeTypesClient feeTypes={feeTypes} canManage={can(user, "payments", "update")} />
    </>
  );
}
