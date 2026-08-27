"use client";

import { ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/misc";
import { SimpleSelect } from "@/components/ui/select";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatNumber } from "@/lib/i18n";
import { transferStudents } from "@/server/actions/students";

export interface TransferStudent {
  id: number;
  name: string;
  studentUid: string | null;
  phone: string | null;
}

export function TransferClient({
  batches,
  initialSourceId,
  students,
}: {
  batches: { id: number; label: string }[];
  initialSourceId: string;
  students: TransferStudent[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [target, setTarget] = React.useState("");
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [pending, startTransition] = React.useTransition();

  // A new source batch means a new roster; keep no stale selections.
  React.useEffect(() => setSelected(new Set()), [students]);

  const allSelected = students.length > 0 && selected.size === students.length;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(students.map((s) => s.id)) : new Set());
  }

  function toggleOne(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function onSourceChange(value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set("from", value);
    else params.delete("from");
    router.replace(`/students/transfer${params.size ? `?${params}` : ""}`);
  }

  function submit() {
    startTransition(async () => {
      const result = await transferStudents([...selected], Number(target));
      if (result.ok) {
        toast.success(`${t.students.transferred} (${formatNumber(result.data?.moved ?? 0, locale)})`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const targetOptions = batches.filter((batch) => String(batch.id) !== initialSourceId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.students.transfer}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label={t.attendance.selectBatch}>
            <SimpleSelect
              value={initialSourceId}
              onValueChange={onSourceChange}
              placeholder={t.attendance.selectBatch}
              options={batches.map((b) => ({ value: String(b.id), label: b.label }))}
            />
          </Field>
          <Field label={t.students.transferTo}>
            <SimpleSelect
              value={target}
              onValueChange={setTarget}
              placeholder={t.attendance.selectBatch}
              options={targetOptions.map((b) => ({ value: String(b.id), label: b.label }))}
            />
          </Field>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={!target || selected.size === 0}
              loading={pending}
              onClick={submit}
            >
              <ArrowRightLeft />
              {t.students.transfer} ({formatNumber(selected.size, locale)})
            </Button>
          </div>
        </CardContent>
      </Card>

      {!initialSourceId ? (
        <EmptyState title={t.attendance.selectBatch} />
      ) : students.length === 0 ? (
        <EmptyState title={t.students.empty} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(value) => toggleAll(Boolean(value))}
                    aria-label={t.common.select}
                  />
                </TH>
                <TH className="w-24">{t.students.studentId}</TH>
                <TH>{t.students.studentName}</TH>
                <TH>{t.common.phone}</TH>
              </TR>
            </THead>
            <TBody>
              {students.map((student) => (
                <TR key={student.id}>
                  <TD>
                    <Checkbox
                      checked={selected.has(student.id)}
                      onCheckedChange={(value) => toggleOne(student.id, Boolean(value))}
                      aria-label={student.name}
                    />
                  </TD>
                  <TD className="font-bold tabular-nums">{student.studentUid ?? "—"}</TD>
                  <TD className="font-medium">{student.name}</TD>
                  <TD className="tabular-nums text-muted">{student.phone ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      {selected.size > 0 ? (
        <Badge variant="primary">
          {formatNumber(selected.size, locale)} {t.common.selected}
        </Badge>
      ) : null}
    </div>
  );
}
