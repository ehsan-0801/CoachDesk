import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { db } from "@/server/db";
import { listActiveBatches } from "@/server/queries/batches";

import { NameChangeClient } from "./name-change-client";

export const metadata = { title: "Name corrections" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NameChangePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("students", "update");
  const { t } = await getI18n();

  const params = await searchParams;
  const batchId = typeof params.batch === "string" ? params.batch : "";

  const batches = await listActiveBatches();
  // Only names nobody has verified yet need attention here.
  const students = batchId
    ? await db.student.findMany({
        where: { batchId: Number(batchId), archived: false, isNameVerified: false },
        orderBy: { studentUid: "asc" },
        select: { id: true, name: true, studentUid: true },
      })
    : [];

  return (
    <>
      <PageHeader title={t.students.nameChange} description={t.students.nameChangeHint} />
      <NameChangeClient
        batches={batches.map((batch) => ({
          id: batch.id,
          label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
        }))}
        batchId={batchId}
        students={students}
      />
    </>
  );
}
