"use client";

import { Check, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { SimpleSelect } from "@/components/ui/select";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatNumber } from "@/lib/i18n";
import { saveAttendance } from "@/server/actions/attendance";
import { cn } from "@/lib/utils";

export interface SheetStudent {
  id: number;
  name: string;
  studentUid: string | null;
  phone: string | null;
  status: "present" | "absent";
}

export function AttendanceSheet({
  batches,
  batchId,
  date,
  students,
  alreadyTaken,
}: {
  batches: { id: number; label: string }[];
  batchId: string;
  date: string;
  students: SheetStudent[];
  alreadyTaken: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [statuses, setStatuses] = React.useState<Record<number, "present" | "absent">>({});
  const [pending, startTransition] = React.useTransition();

  // Reset whenever the roster changes, so a new batch/date starts from its own
  // saved state rather than the previous sheet's edits.
  React.useEffect(() => {
    setStatuses(Object.fromEntries(students.map((s) => [s.id, s.status])));
  }, [students]);

  function navigate(next: { batch?: string; date?: string }) {
    const params = new URLSearchParams();
    params.set("batch", next.batch ?? batchId);
    params.set("date", next.date ?? date);
    router.replace(`/attendance/take?${params}`);
  }

  const presentCount = Object.values(statuses).filter((s) => s === "present").length;
  const absentCount = students.length - presentCount;

  function setAll(status: "present" | "absent") {
    setStatuses(Object.fromEntries(students.map((s) => [s.id, status])));
  }

  function submit() {
    startTransition(async () => {
      const result = await saveAttendance({
        batchId: Number(batchId),
        date,
        entries: students.map((student) => ({
          studentId: student.id,
          status: statuses[student.id] ?? "present",
        })),
      });
      if (result.ok) {
        toast.success(alreadyTaken ? t.attendance.alreadyTaken : t.attendance.saved);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.attendance.take}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label={t.attendance.selectBatch}>
            <SimpleSelect
              value={batchId}
              onValueChange={(value) => navigate({ batch: value })}
              placeholder={t.attendance.selectBatch}
              options={batches.map((b) => ({ value: String(b.id), label: b.label }))}
            />
          </Field>
          <Field label={t.attendance.selectDate}>
            <Input type="date" value={date} onChange={(event) => navigate({ date: event.target.value })} />
          </Field>
          <div className="flex items-end gap-2">
            <Button variant="success" size="md" className="flex-1" onClick={() => setAll("present")}>
              <Check /> {t.attendance.markAllPresent}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!batchId ? (
        <EmptyState title={t.attendance.selectBatch} />
      ) : students.length === 0 ? (
        <EmptyState title={t.students.empty} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">
              {t.attendance.present}: {formatNumber(presentCount, locale)}
            </Badge>
            <Badge variant="danger">
              {t.attendance.absent}: {formatNumber(absentCount, locale)}
            </Badge>
            {alreadyTaken ? <Badge variant="warning">{t.attendance.alreadyTaken}</Badge> : null}
            <Button className="ml-auto" loading={pending} onClick={submit}>
              <Save /> {t.common.save}
            </Button>
          </div>

          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH className="w-24">{t.students.studentId}</TH>
                  <TH>{t.students.studentName}</TH>
                  <TH className="w-56 text-right">{t.common.status}</TH>
                </TR>
              </THead>
              <TBody>
                {students.map((student) => {
                  const status = statuses[student.id] ?? "present";
                  return (
                    <TR key={student.id} className={cn(status === "absent" && "bg-danger/10")}>
                      <TD className="font-bold tabular-nums">{student.studentUid ?? "—"}</TD>
                      <TD className="font-medium">{student.name}</TD>
                      <TD>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant={status === "present" ? "success" : "outline"}
                            onClick={() => setStatuses((prev) => ({ ...prev, [student.id]: "present" }))}
                            aria-pressed={status === "present"}
                          >
                            <Check /> {t.attendance.present}
                          </Button>
                          <Button
                            size="sm"
                            variant={status === "absent" ? "danger" : "outline"}
                            onClick={() => setStatuses((prev) => ({ ...prev, [student.id]: "absent" }))}
                            aria-pressed={status === "absent"}
                          >
                            <X /> {t.attendance.absent}
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>

          <div className="flex justify-end">
            <Button loading={pending} onClick={submit}>
              <Save /> {t.common.save}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
