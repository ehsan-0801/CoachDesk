"use client";

import { CalendarPlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { Field, FieldGrid } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { SimpleSelect } from "@/components/ui/select";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatDateShort, formatNumber, formatTimeRange } from "@/lib/i18n";
import { assignExamToBatch, deleteExamAssignment } from "@/server/actions/exams";

export interface AssignmentRow {
  id: number;
  examId: number;
  examName: string;
  subjectName: string | null;
  batchLabel: string;
  batchArchived: boolean;
  examDate: string;
  startTime: string | null;
  endTime: string | null;
  totalMarks: number;
  resultCount: number;
}

export function AssignClient({
  exams,
  batches,
  assignments,
  today,
  canCreate,
  canDelete,
}: {
  exams: { id: number; label: string }[];
  batches: { id: number; label: string }[];
  assignments: AssignmentRow[];
  today: string;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(assignExamToBatch, null);
  const [deleting, setDeleting] = React.useState<AssignmentRow | null>(null);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t.exams.assigned);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, t, router]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <div className="space-y-4">
      {canCreate ? (
        <form action={formAction}>
          <Card>
            <CardHeader>
              <CardTitle>{t.exams.assign}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGrid columns={3}>
                <Field label={t.exams.examName} required error={errors.examId}>
                  <SimpleSelect
                    name="examId"
                    options={exams.map((exam) => ({ value: String(exam.id), label: exam.label }))}
                    placeholder={t.common.select}
                  />
                </Field>
                <Field label={t.students.batch} required error={errors.batchId}>
                  <SimpleSelect
                    name="batchId"
                    options={batches.map((batch) => ({ value: String(batch.id), label: batch.label }))}
                    placeholder={t.attendance.selectBatch}
                  />
                </Field>
                <Field label={t.exams.examDate} htmlFor="examDate" required error={errors.examDate}>
                  <Input id="examDate" name="examDate" type="date" defaultValue={today} required />
                </Field>
                <Field label={t.batches.startTime} htmlFor="startTime">
                  <Input id="startTime" name="startTime" type="time" />
                </Field>
                <Field label={t.batches.endTime} htmlFor="endTime">
                  <Input id="endTime" name="endTime" type="time" />
                </Field>
              </FieldGrid>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" loading={pending}>
                <CalendarPlus /> {t.exams.assign}
              </Button>
            </CardFooter>
          </Card>
        </form>
      ) : null}

      {assignments.length === 0 ? (
        <EmptyState title={t.exams.empty} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>{t.exams.examName}</TH>
                <TH>{t.students.batch}</TH>
                <TH>{t.exams.examDate}</TH>
                <TH>{t.common.time}</TH>
                <TH className="text-right">{t.exams.totalMarks}</TH>
                <TH className="text-right">{t.exams.results}</TH>
                <TH className="w-12" />
              </TR>
            </THead>
            <TBody>
              {assignments.map((assignment) => (
                <TR key={assignment.id}>
                  <TD>
                    <span className="block font-medium">{assignment.examName}</span>
                    <span className="block text-xs text-muted">{assignment.subjectName ?? "—"}</span>
                  </TD>
                  <TD>
                    <span className="text-sm">{assignment.batchLabel}</span>
                    {assignment.batchArchived ? (
                      <Badge variant="neutral" className="ml-1.5">
                        {t.common.archived}
                      </Badge>
                    ) : null}
                  </TD>
                  <TD className="whitespace-nowrap">{formatDateShort(assignment.examDate, locale)}</TD>
                  <TD className="whitespace-nowrap text-muted">
                    {formatTimeRange(assignment.startTime, assignment.endTime, locale)}
                  </TD>
                  <TD className="text-right tabular-nums">{formatNumber(assignment.totalMarks, locale)}</TD>
                  <TD className="text-right">
                    <Badge variant={assignment.resultCount > 0 ? "success" : "neutral"}>
                      {formatNumber(assignment.resultCount, locale)}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-danger"
                        onClick={() => setDeleting(assignment)}
                        aria-label={t.common.delete}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      <Confirm
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t.common.delete}
        description={deleting ? `${deleting.examName} — ${deleting.batchLabel}` : undefined}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          const result = await deleteExamAssignment(deleting!.id);
          if (result.ok) {
            toast.success(t.common.delete);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </div>
  );
}
