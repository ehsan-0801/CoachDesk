"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { SimpleSelect } from "@/components/ui/select";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatNumber } from "@/lib/i18n";
import { saveBatchResults } from "@/server/actions/exams";
import { cn } from "@/lib/utils";

export interface SheetRow {
  id: number;
  name: string;
  studentUid: string | null;
  mcqMarks: number | null;
  cqMarks: number | null;
  absent: boolean;
}

export function ResultSheet({
  batches,
  exams,
  batchId,
  examId,
  rows,
  maxMcq,
  maxCq,
}: {
  batches: { id: number; label: string }[];
  exams: { id: number; label: string }[];
  batchId: string;
  examId: string;
  rows: SheetRow[];
  maxMcq: number;
  maxCq: number;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [entries, setEntries] = React.useState<Record<number, SheetRow>>({});
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setEntries(Object.fromEntries(rows.map((row) => [row.id, row])));
  }, [rows]);

  function navigate(next: { batch?: string; exam?: string }) {
    const params = new URLSearchParams();
    const nextBatch = next.batch ?? batchId;
    params.set("batch", nextBatch);
    // Changing batch invalidates the exam: a different batch may not sit the
    // same paper, and keeping a stale exam id would show an empty sheet.
    if (!next.batch && examId) params.set("exam", next.exam ?? examId);
    else if (next.exam) params.set("exam", next.exam);
    router.replace(`/exams/results/batch-wise?${params}`);
  }

  function update(id: number, patch: Partial<SheetRow>) {
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function submit() {
    startTransition(async () => {
      const result = await saveBatchResults({
        examId: Number(examId),
        batchId: Number(batchId),
        entries: Object.values(entries).map((row) => ({
          studentId: row.id,
          mcqMarks: row.absent ? null : (row.mcqMarks ?? 0),
          cqMarks: row.absent ? null : (row.cqMarks ?? 0),
          absent: row.absent,
        })),
      });
      if (result.ok) {
        toast.success(t.exams.resultSaved);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const present = Object.values(entries).filter((row) => !row.absent).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.exams.resultsByBatch}</CardTitle>
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
          <Field label={t.exams.examName}>
            <SimpleSelect
              value={examId}
              onValueChange={(value) => navigate({ exam: value })}
              placeholder={t.common.select}
              options={exams.map((e) => ({ value: String(e.id), label: e.label }))}
              disabled={!batchId}
            />
          </Field>
          <div className="flex items-end">
            <Button className="w-full" disabled={!examId || rows.length === 0} loading={pending} onClick={submit}>
              <Save /> {t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!examId ? (
        <EmptyState title={t.exams.empty} description={t.common.select} />
      ) : rows.length === 0 ? (
        <EmptyState title={t.students.empty} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">
              {t.exams.results}: {formatNumber(present, locale)}
            </Badge>
            <Badge variant="danger">
              {t.exams.absentStudents}: {formatNumber(rows.length - present, locale)}
            </Badge>
            <Badge variant="outline">
              {t.exams.totalMarks}: {formatNumber(maxMcq + maxCq, locale)}
            </Badge>
          </div>

          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH className="w-20">{t.students.studentId}</TH>
                  <TH>{t.students.studentName}</TH>
                  <TH className="w-28 text-right">
                    {t.exams.mcqMarks} / {formatNumber(maxMcq, locale)}
                  </TH>
                  <TH className="w-28 text-right">
                    {t.exams.cqMarks} / {formatNumber(maxCq, locale)}
                  </TH>
                  <TH className="w-24 text-right">{t.common.total}</TH>
                  <TH className="w-24 text-center">{t.attendance.absent}</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const entry = entries[row.id] ?? row;
                  const total = (entry.mcqMarks ?? 0) + (entry.cqMarks ?? 0);
                  return (
                    <TR key={row.id} className={cn(entry.absent && "bg-danger/10")}>
                      <TD className="font-bold tabular-nums">{row.studentUid ?? "—"}</TD>
                      <TD className="font-medium">{row.name}</TD>
                      <TD>
                        <Input
                          type="number"
                          min={0}
                          max={maxMcq}
                          disabled={entry.absent}
                          value={entry.mcqMarks ?? ""}
                          onChange={(event) =>
                            update(row.id, {
                              mcqMarks: event.target.value === "" ? null : Number(event.target.value),
                            })
                          }
                          className="h-8 text-right"
                          aria-label={`${t.exams.mcqMarks} — ${row.name}`}
                        />
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          min={0}
                          max={maxCq}
                          disabled={entry.absent}
                          value={entry.cqMarks ?? ""}
                          onChange={(event) =>
                            update(row.id, {
                              cqMarks: event.target.value === "" ? null : Number(event.target.value),
                            })
                          }
                          className="h-8 text-right"
                          aria-label={`${t.exams.cqMarks} — ${row.name}`}
                        />
                      </TD>
                      <TD className="text-right font-bold tabular-nums">
                        {entry.absent ? "—" : formatNumber(total, locale)}
                      </TD>
                      <TD className="text-center">
                        <Checkbox
                          checked={entry.absent}
                          onCheckedChange={(value) => update(row.id, { absent: Boolean(value) })}
                          aria-label={`${t.attendance.absent} — ${row.name}`}
                        />
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
