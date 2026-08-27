import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { listBatches } from "@/server/queries/batches";

import { BatchInfoClient } from "./batch-info-client";

export const metadata = { title: "Batch showcase" };

export default async function BatchInfoPage() {
  await requirePermission("homepage", "view");
  const { t } = await getI18n();
  const batches = await listBatches({ archived: "active" });

  return (
    <>
      <PageHeader title={t.homepage.batchShowcase} description={t.homepage.showcaseHint} />
      <BatchInfoClient
        batches={batches.map((batch) => ({
          id: batch.id,
          label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
          hscYear: batch.hscYear,
          infoLine1: batch.infoLine1,
          infoLine2: batch.infoLine2,
          hscYearColor: batch.hscYearColor,
          infoLine1Color: batch.infoLine1Color,
          infoLine2Color: batch.infoLine2Color,
        }))}
      />
    </>
  );
}
