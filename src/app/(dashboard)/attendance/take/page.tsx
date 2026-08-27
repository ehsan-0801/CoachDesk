import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { isoDate } from "@/lib/utils";
import { requirePermission } from "@/server/auth";
import { getAttendanceSheet } from "@/server/queries/attendance";
import { listActiveBatches } from "@/server/queries/batches";

import { AttendanceSheet } from "./attendance-sheet";

export const metadata = { title: "Take attendance" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TakeAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("attendance", "create");
  const { t } = await getI18n();

  const params = await searchParams;
  const batches = await listActiveBatches();

  const batchId = typeof params.batch === "string" ? params.batch : String(batches[0]?.id ?? "");
  const date = typeof params.date === "string" ? params.date : isoDate();

  const sheet = batchId ? await getAttendanceSheet(Number(batchId), date) : null;

  return (
    <>
      <PageHeader title={t.attendance.take} description={t.attendance.title} />
      <AttendanceSheet
        batches={batches.map((batch) => ({
          id: batch.id,
          label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
        }))}
        batchId={batchId}
        date={date}
        students={sheet?.students ?? []}
        alreadyTaken={sheet?.alreadyTaken ?? false}
      />
    </>
  );
}
