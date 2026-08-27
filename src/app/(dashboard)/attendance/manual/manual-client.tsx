"use client";

import { UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { SimpleSelect } from "@/components/ui/select";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/i18n";
import { saveManualAttendance } from "@/server/actions/attendance";

export function ManualAttendanceClient({
  batches,
  batchId,
  date,
  students,
}: {
  batches: { id: number; label: string }[];
  batchId: string;
  date: string;
  students: { id: number; name: string; studentUid: string | null; status: "present" | "absent" }[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => setSelected(new Set()), [students]);

  function navigate(next: { batch?: string; date?: string }) {
    const params = new URLSearchParams();
    params.set("batch", next.batch ?? batchId);
    params.set("date", next.date ?? date);
    router.replace(`/attendance/manual?${params}`);
  }

  function submit() {
    startTransition(async () => {
      const result = await saveManualAttendance({
        batchId: Number(batchId),
        date,
        studentIds: [...selected],
      });
      if (result.ok) {
        const { created = 0, updated = 0, alreadyPresent = 0 } = result.data ?? {};
        toast.success(
          `${t.attendance.saved} — +${formatNumber(created + updated, locale)}${
            alreadyPresent ? ` (${formatNumber(alreadyPresent, locale)} ${t.attendance.present})` : ""
          }`,
        );
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
          <CardTitle>{t.attendance.manual}</CardTitle>
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
          <div className="flex items-end">
            <Button className="w-full" disabled={selected.size === 0} loading={pending} onClick={submit}>
              <UserCheck /> {t.attendance.present} ({formatNumber(selected.size, locale)})
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="rounded-[--radius-retro] border-2 border-line bg-warning/25 px-3 py-2 text-sm font-medium">
        {t.attendance.manualHint}
      </p>

      {students.length === 0 ? (
        <EmptyState title={t.students.empty} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH className="w-10" />
                <TH className="w-24">{t.students.studentId}</TH>
                <TH>{t.students.studentName}</TH>
                <TH className="text-right">{t.common.status}</TH>
              </TR>
            </THead>
            <TBody>
              {students.map((student) => (
                <TR key={student.id}>
                  <TD>
                    <Checkbox
                      checked={selected.has(student.id)}
                      disabled={student.status === "present"}
                      onCheckedChange={(value) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (value) next.add(student.id);
                          else next.delete(student.id);
                          return next;
                        })
                      }
                      aria-label={student.name}
                    />
                  </TD>
                  <TD className="font-bold tabular-nums">{student.studentUid ?? "—"}</TD>
                  <TD className="font-medium">{student.name}</TD>
                  <TD className="text-right">
                    <Badge variant={student.status === "present" ? "success" : "danger"}>
                      {student.status === "present" ? t.attendance.present : t.attendance.absent}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
