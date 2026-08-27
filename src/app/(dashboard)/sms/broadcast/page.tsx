import { PageHeader } from "@/components/shell/page-header";
import { SmsDisabledBanner } from "@/components/shell/sms-disabled-banner";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { listBatches } from "@/server/queries/batches";

import { BroadcastClient } from "./broadcast-client";

export const metadata = { title: "Batch broadcast" };

export default async function BroadcastPage() {
  await requirePermission("sms", "create");
  const { t } = await getI18n();
  const batches = await listBatches({ archived: "active" });

  return (
    <>
      <PageHeader title={t.sms.batchwise} description={t.sms.title} />
      <SmsDisabledBanner />
      <BroadcastClient
        batches={batches.map((batch) => ({
          id: batch.id,
          label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
          studentCount: batch.studentCount,
        }))}
      />
    </>
  );
}
