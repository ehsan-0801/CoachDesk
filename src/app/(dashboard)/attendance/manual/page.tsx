import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { isoDate } from "@/lib/utils";
import { requirePermission } from "@/server/auth";
import { getDailyBatchDetail } from "@/server/queries/attendance";
import { listActiveBatches } from "@/server/queries/batches";

import { ManualAttendanceClient } from "./manual-client";

export const metadata = { title: "Manual attendance" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ManualAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("attendance", "create");
  const { t } = await getI18n();

  const params = await searchParams;
  const batches = await listActiveBatches();

  const batchId = typeof params.batch === "string" ? params.batch : String(batches[0]?.id ?? "");
  const date = typeof params.date === "string" ? params.date : isoDate();

  const detail = batchId ? await getDailyBatchDetail(Number(batchId), date) : null;

  return (
    <>
      <PageHeader title={t.attendance.manual} description={t.attendance.manualHint} />
      <ManualAttendanceClient
        batches={batches.map((batch) => ({
          id: batch.id,
          label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
        }))}
        batchId={batchId}
        date={date}
        students={(detail?.students ?? []).map((student) => ({
          id: student.id,
          name: student.name,
          studentUid: student.studentUid,
          // No record on a manual-entry day means the student is not yet marked in.
          status: student.status === "present" ? ("present" as const) : ("absent" as const),
        }))}
      />
    </>
  );
}
