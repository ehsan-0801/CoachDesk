"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGrid } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { StudentPicker, type PickedStudent } from "@/components/ui/student-picker";
import { formatNumber } from "@/lib/i18n";
import { saveBatchResults } from "@/server/actions/exams";

/**
 * Single-student result entry, for latecomers and make-up papers that the
 * batch sheet has already been submitted without.
 */
export function StudentWiseClient({
  exams,
}: {
  exams: { id: number; label: string; batchId: number; mcqMarks: number; cqMarks: number }[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [examId, setExamId] = React.useState("");
  const [mcq, setMcq] = React.useState("");
  const [cq, setCq] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const exam = exams.find((e) => String(e.id) === examId);
  const total = (Number(mcq) || 0) + (Number(cq) || 0);

  function submit() {
    if (!student || !exam) return;
    startTransition(async () => {
      const result = await saveBatchResults({
        examId: exam.id,
        batchId: exam.batchId,
        entries: [
          {
            studentId: student.id,
            mcqMarks: mcq === "" ? 0 : Number(mcq),
            cqMarks: cq === "" ? 0 : Number(cq),
            absent: false,
          },
        ],
      });
      if (result.ok) {
        toast.success(t.exams.resultSaved);
        setMcq("");
        setCq("");
        setStudent(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.exams.resultsByStudent}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Field label={t.students.studentName} required>
          <StudentPicker value={student} onChange={setStudent} includeArchived />
        </Field>

        <Field label={t.exams.examName} required>
          <SimpleSelect
            value={examId}
            onValueChange={setExamId}
            placeholder={t.common.select}
            options={exams.map((e) => ({ value: String(e.id), label: e.label }))}
          />
        </Field>

        {exam ? (
          <FieldGrid columns={3}>
            <Field label={`${t.exams.mcqMarks} / ${formatNumber(exam.mcqMarks, locale)}`} htmlFor="mcq">
              <Input
                id="mcq"
                type="number"
                min={0}
                max={exam.mcqMarks}
                value={mcq}
                onChange={(event) => setMcq(event.target.value)}
              />
            </Field>
            <Field label={`${t.exams.cqMarks} / ${formatNumber(exam.cqMarks, locale)}`} htmlFor="cq">
              <Input
                id="cq"
                type="number"
                min={0}
                max={exam.cqMarks}
                value={cq}
                onChange={(event) => setCq(event.target.value)}
              />
            </Field>
            <Field label={t.common.total}>
              <div className="flex h-10 items-center rounded-[--radius-retro] border-2 border-line bg-surface-2 px-3 font-bold tabular-nums">
                {formatNumber(total, locale)} / {formatNumber(exam.mcqMarks + exam.cqMarks, locale)}
              </div>
            </Field>
          </FieldGrid>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button loading={pending} disabled={!student || !exam} onClick={submit}>
          <Save /> {t.common.save}
        </Button>
      </CardFooter>
    </Card>
  );
}
