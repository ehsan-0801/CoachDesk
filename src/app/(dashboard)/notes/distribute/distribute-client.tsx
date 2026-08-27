"use client";

import { PackageCheck } from "lucide-react";
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
import { distributeNotes } from "@/server/actions/notes";

export interface DistributionStudent {
  id: number;
  name: string;
  studentUid: string | null;
  alreadyHas: boolean;
}

export function DistributeClient({
  notes,
  batches,
  noteId,
  batchId,
  students,
  stock,
  basePath,
}: {
  notes: { id: number; label: string; quantity: number }[];
  batches: { id: number; label: string }[];
  noteId: string;
  batchId: string;
  students: DistributionStudent[];
  stock: number;
  basePath: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => setSelected(new Set()), [students, noteId]);

  function navigate(next: { note?: string; batch?: string }) {
    const params = new URLSearchParams();
    const note = next.note ?? noteId;
    const batch = next.batch ?? batchId;
    if (note) params.set("note", note);
    if (batch) params.set("batch", batch);
    router.replace(`${basePath}${params.size ? `?${params}` : ""}`);
  }

  const eligible = students.filter((student) => !student.alreadyHas);
  const allSelected = eligible.length > 0 && selected.size === eligible.length;

  function submit() {
    startTransition(async () => {
      const result = await distributeNotes(Number(noteId), [...selected]);
      if (result.ok) {
        toast.success(
          `${t.notes.distributed}: ${formatNumber(result.data?.distributed ?? 0, locale)}` +
            (result.data?.skipped ? ` · ${t.notes.alreadyDistributed}` : ""),
        );
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const overStock = selected.size > stock;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.notes.distribute}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label={t.notes.noteName}>
            <SimpleSelect
              value={noteId}
              onValueChange={(value) => navigate({ note: value })}
              placeholder={t.common.select}
              options={notes.map((note) => ({
                value: String(note.id),
                label: `${note.label} (${formatNumber(note.quantity, locale)})`,
              }))}
            />
          </Field>
          <Field label={t.attendance.selectBatch}>
            <SimpleSelect
              value={batchId}
              onValueChange={(value) => navigate({ batch: value })}
              placeholder={t.attendance.selectBatch}
              options={batches.map((batch) => ({ value: String(batch.id), label: batch.label }))}
            />
          </Field>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={selected.size === 0 || overStock}
              loading={pending}
              onClick={submit}
            >
              <PackageCheck /> {t.notes.distribute} ({formatNumber(selected.size, locale)})
            </Button>
          </div>
        </CardContent>
      </Card>

      {noteId ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={stock > 0 ? "success" : "danger"}>
            {t.notes.inStock}: {formatNumber(stock, locale)}
          </Badge>
          {overStock ? <Badge variant="danger">{t.notes.notEnoughStock}</Badge> : null}
        </div>
      ) : null}

      {!noteId || !batchId ? (
        <EmptyState title={t.common.select} />
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
                    onCheckedChange={(value) =>
                      setSelected(value ? new Set(eligible.map((s) => s.id)) : new Set())
                    }
                    aria-label={t.common.select}
                  />
                </TH>
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
                      disabled={student.alreadyHas}
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
                    {student.alreadyHas ? (
                      <Badge variant="neutral">{t.notes.distributedCount}</Badge>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
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
