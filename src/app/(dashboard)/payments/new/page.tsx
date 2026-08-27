import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { isoDate } from "@/lib/utils";
import { requirePermission } from "@/server/auth";
import { listFeeTypes } from "@/server/queries/payments";

import { PaymentForm } from "./payment-form";

export const metadata = { title: "Record payment" };

export default async function NewPaymentPage() {
  await requirePermission("payments", "create");
  const { t } = await getI18n();
  const feeTypes = await listFeeTypes();

  return (
    <>
      <PageHeader title={t.payments.record} description={t.payments.title} />
      <PaymentForm feeTypes={feeTypes.filter((f) => f.isActive)} today={isoDate()} />
    </>
  );
}
