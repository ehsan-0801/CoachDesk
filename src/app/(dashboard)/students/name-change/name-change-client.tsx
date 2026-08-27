"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { SimpleSelect } from "@/components/ui/select";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { updateStudentName } from "@/server/actions/students";

export function NameChangeClient({
  batches,
  batchId,
  students,
}: {
  batches: { id: number; label: string }[];
  batchId: string;
  students: { id: number; name: string; studentUid: string | null }[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [drafts, setDrafts] = React.useState<Record<number, string>>({});
  const [savingId, setSavingId] = React.useState<number | null>(null);

  function onBatchChange(value: string) {
    router.replace(`/students/name-change${value ? `?batch=${value}` : ""}`);
  }

  async function save(id: number, original: string) {
    const next = (drafts[id] ?? original).trim();
    if (!next || next === original) return;
    setSavingId(id);
    const result = await updateStudentName(id, next);
    setSavingId(null);
    if (result.ok) {
      toast.success(t.students.nameUpdated);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.students.nameChange}</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label={t.attendance.selectBatch} hint={t.students.nameChangeHint}>
            <SimpleSelect
              value={batchId}
              onValueChange={onBatchChange}
              placeholder={t.attendance.selectBatch}
              options={batches.map((b) => ({ value: String(b.id), label: b.label }))}
              className="sm:max-w-sm"
            />
          </Field>
        </CardContent>
      </Card>

      {!batchId ? (
        <EmptyState title={t.attendance.selectBatch} />
      ) : students.length === 0 ? (
        <EmptyState title={t.common.noResults} description="Every name in this batch is already verified." />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH className="w-24">{t.students.studentId}</TH>
                <TH>{t.students.studentName}</TH>
                <TH className="w-28" />
              </TR>
            </THead>
            <TBody>
              {students.map((student) => (
                <TR key={student.id}>
                  <TD className="font-bold tabular-nums">{student.studentUid ?? "—"}</TD>
                  <TD>
                    <Input
                      value={drafts[student.id] ?? student.name}
                      onChange={(event) =>
                        setDrafts((prev) => ({ ...prev, [student.id]: event.target.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void save(student.id, student.name);
                        }
                      }}
                      aria-label={`${t.students.studentName} — ${student.studentUid ?? student.id}`}
                    />
                  </TD>
                  <TD className="text-right">
                    <Button
                      size="sm"
                      variant="success"
                      loading={savingId === student.id}
                      disabled={(drafts[student.id] ?? student.name).trim() === student.name}
                      onClick={() => save(student.id, student.name)}
                    >
                      <Check /> {t.common.save}
                    </Button>
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
