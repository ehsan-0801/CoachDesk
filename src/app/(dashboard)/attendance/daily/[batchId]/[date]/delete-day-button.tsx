"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { deleteDayAttendance } from "@/server/actions/attendance";

export function DeleteDayButton({ batchId, date }: { batchId: number; date: string }) {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <Confirm
      title={t.attendance.deleteDay}
      description={date}
      confirmLabel={t.common.delete}
      onConfirm={async () => {
        const result = await deleteDayAttendance(batchId, date);
        if (result.ok) {
          toast.success(t.attendance.deleted);
          router.push(`/attendance/daily?date=${date}`);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }}
    >
      <Button variant="danger" size="sm">
        <Trash2 /> {t.common.delete}
      </Button>
    </Confirm>
  );
}
