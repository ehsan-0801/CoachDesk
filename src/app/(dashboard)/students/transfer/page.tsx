import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { listStudentsByBatch } from "@/server/queries/students";

import { TransferClient } from "./transfer-client";

export const metadata = { title: "Transfer students" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TransferPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("students", "update");
  const { t } = await getI18n();

  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : "";

  const batches = await listActiveBatches();
  const students = from ? await listStudentsByBatch(Number(from)) : [];

  return (
    <>
      <PageHeader title={t.students.transfer} description={t.students.subtitle} />
      <TransferClient
        batches={batches.map((batch) => ({
          id: batch.id,
          label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
        }))}
        initialSourceId={from}
        students={students.map((s) => ({
          id: s.id,
          name: s.name,
          studentUid: s.studentUid,
          phone: s.phone,
        }))}
      />
    </>
  );
}
