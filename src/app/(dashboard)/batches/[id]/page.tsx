import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { updateBatch } from "@/server/actions/batches";
import { requirePermission } from "@/server/auth";
import { getBatch } from "@/server/queries/batches";

import { BatchForm } from "../batch-form";

export const metadata = { title: "Edit batch" };

export default async function EditBatchPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("batches", "update");
  const { t } = await getI18n();

  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const batch = await getBatch(id);
  if (!batch) notFound();

  // `updateBatch` takes the id first; bind it so the form sees the standard
  // `(prevState, formData)` action signature.
  const action = updateBatch.bind(null, batch.id);

  return (
    <>
      <PageHeader
        title={t.batches.edit}
        description={batch.name ?? `${t.batches.batchNumber} ${batch.batchNumber}`}
      />
      <BatchForm
        action={action as never}
        submitLabel={t.common.save}
        successMessage={t.batches.updated}
        defaults={{
          batchNumber: batch.batchNumber,
          name: batch.name,
          hscYear: batch.hscYear,
          daysInWeek: batch.daysInWeek,
          startTime: batch.startTime,
          endTime: batch.endTime,
          startingDate: batch.startingDate.toISOString().slice(0, 10),
          duration: batch.duration,
          tuitionFee: batch.tuitionFee,
          admissionFee: batch.admissionFee,
        }}
      />
    </>
  );
}
