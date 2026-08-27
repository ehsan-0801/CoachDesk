import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { getDistributionSheet, listNotes } from "@/server/queries/notes";

import { DistributeClient } from "../distribute-client";

export const metadata = { title: "Distribute notes" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DistributePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("notes", "create");
  const { t } = await getI18n();

  const params = await searchParams;
  const [notes, batches] = await Promise.all([listNotes(), listActiveBatches()]);

  const noteId = typeof params.note === "string" ? params.note : String(notes[0]?.id ?? "");
  const batchId = typeof params.batch === "string" ? params.batch : "";

  const sheet = noteId && batchId ? await getDistributionSheet(Number(noteId), Number(batchId)) : null;

  return (
    <>
      <PageHeader title={t.notes.distributeManual} description={t.notes.title} />
      <DistributeClient
        basePath="/notes/distribute/manual"
        notes={notes.map((note) => ({ id: note.id, label: note.name, quantity: note.quantity }))}
        batches={batches.map((batch) => ({
          id: batch.id,
          label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
        }))}
        noteId={noteId}
        batchId={batchId}
        students={sheet?.students ?? []}
        stock={sheet?.note?.quantity ?? notes.find((n) => String(n.id) === noteId)?.quantity ?? 0}
      />
    </>
  );
}
