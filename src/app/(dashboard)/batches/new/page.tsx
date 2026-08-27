import { PageHeader } from "@/components/shell/page-header";
import { isoDate } from "@/lib/utils";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { createBatch } from "@/server/actions/batches";
import { nextBatchNumber } from "@/server/queries/batches";

import { BatchForm } from "../batch-form";

export const metadata = { title: "Create batch" };

export default async function NewBatchPage() {
  await requirePermission("batches", "create");
  const { t } = await getI18n();
  const suggestedNumber = await nextBatchNumber();

  return (
    <>
      <PageHeader title={t.batches.create} description={t.batches.subtitle} />
      <BatchForm
        action={createBatch}
        submitLabel={t.common.create}
        successMessage={t.batches.created}
        defaults={{
          batchNumber: suggestedNumber,
          name: null,
          hscYear: String(new Date().getFullYear() + 1),
          daysInWeek: ["saturday", "monday", "wednesday"],
          startTime: "08:00",
          endTime: "09:30",
          startingDate: isoDate(),
          duration: "12 months",
          tuitionFee: 1200,
          admissionFee: 1000,
        }}
      />
    </>
  );
}
