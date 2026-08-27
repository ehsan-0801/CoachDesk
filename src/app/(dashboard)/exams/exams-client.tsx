"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGrid } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatNumber } from "@/lib/i18n";
import { deleteExam, saveExam } from "@/server/actions/exams";

export interface ExamRow {
  id: number;
  examName: string;
  subjectName: string | null;
  paperNumber: string | null;
  chapter: string | null;
  examType: string | null;
  mcqMarks: number;
  cqMarks: number;
  totalMarks: number;
  batchCount: number;
  resultCount: number;
}

export function ExamsClient({
  exams,
  canCreate,
  canUpdate,
  canDelete,
}: {
  exams: ExamRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = React.useState<ExamRow | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<ExamRow | null>(null);

  return (
    <>
      {canCreate ? (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus /> {t.exams.create}
          </Button>
        </div>
      ) : null}

      {exams.length === 0 ? (
        <EmptyState title={t.exams.empty} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>{t.exams.examName}</TH>
                <TH>{t.exams.subject}</TH>
                <TH>{t.exams.chapter}</TH>
                <TH className="text-right">{t.exams.mcqMarks}</TH>
                <TH className="text-right">{t.exams.cqMarks}</TH>
                <TH className="text-right">{t.exams.totalMarks}</TH>
                <TH className="text-right">{t.exams.results}</TH>
                <TH className="w-24" />
              </TR>
            </THead>
            <TBody>
              {exams.map((exam) => (
                <TR key={exam.id}>
                  <TD>
                    <span className="block font-medium">{exam.examName}</span>
                    {exam.examType ? <Badge variant="outline">{exam.examType}</Badge> : null}
                  </TD>
                  <TD className="text-muted">
                    {exam.subjectName ?? "—"}
                    {exam.paperNumber ? ` · ${exam.paperNumber}` : ""}
                  </TD>
                  <TD className="max-w-56 truncate text-muted">{exam.chapter ?? "—"}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(exam.mcqMarks, locale)}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(exam.cqMarks, locale)}</TD>
                  <TD className="text-right font-bold tabular-nums">{formatNumber(exam.totalMarks, locale)}</TD>
                  <TD className="text-right">
                    <Badge variant={exam.resultCount > 0 ? "success" : "neutral"}>
                      {formatNumber(exam.resultCount, locale)}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate ? (
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(exam)} aria-label={t.common.edit}>
                          <Pencil />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-danger"
                          onClick={() => setDeleting(exam)}
                          aria-label={t.common.delete}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      {editing ? (
        <ExamDialog
          exam={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      <Confirm
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t.common.delete}
        description={
          deleting?.resultCount
            ? `${deleting.examName} — ${formatNumber(deleting.resultCount, locale)} ${t.exams.results}`
            : deleting?.examName
        }
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          const result = await deleteExam(deleting!.id);
          if (result.ok) {
            toast.success(t.common.delete);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </>
  );
}

function ExamDialog({
  exam,
  onClose,
  onSaved,
}: {
  exam: ExamRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const action = saveExam.bind(null, exam?.id ?? null);
  const [state, formAction, pending] = useActionState(action, null);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(exam ? t.common.save : t.exams.created);
      onSaved();
    } else {
      toast.error(state.error);
    }
  }, [state, onSaved, t, exam]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{exam ? t.common.edit : t.exams.create}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label={t.exams.examName} htmlFor="examName" required error={errors.examName}>
              <Input id="examName" name="examName" defaultValue={exam?.examName ?? ""} required />
            </Field>
            <FieldGrid columns={2}>
              <Field label={t.exams.subject} htmlFor="subjectName">
                <Input id="subjectName" name="subjectName" defaultValue={exam?.subjectName ?? ""} />
              </Field>
              <Field label={t.exams.paper} htmlFor="paperNumber">
                <Input id="paperNumber" name="paperNumber" defaultValue={exam?.paperNumber ?? ""} />
              </Field>
            </FieldGrid>
            <Field label={t.exams.chapter} htmlFor="chapter">
              <Input id="chapter" name="chapter" defaultValue={exam?.chapter ?? ""} />
            </Field>
            <FieldGrid columns={3}>
              <Field label={t.exams.examType} htmlFor="examType">
                <Input id="examType" name="examType" defaultValue={exam?.examType ?? ""} placeholder="Weekly" />
              </Field>
              <Field label={t.exams.mcqMarks} htmlFor="mcqMarks" error={errors.mcqMarks}>
                <Input id="mcqMarks" name="mcqMarks" type="number" min={0} defaultValue={exam?.mcqMarks ?? 25} />
              </Field>
              <Field label={t.exams.cqMarks} htmlFor="cqMarks" error={errors.cqMarks}>
                <Input id="cqMarks" name="cqMarks" type="number" min={0} defaultValue={exam?.cqMarks ?? 25} />
              </Field>
            </FieldGrid>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" loading={pending}>
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
