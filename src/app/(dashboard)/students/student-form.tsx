"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGrid } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import type { ActionResult } from "@/lib/action-result";
import { formatCurrency } from "@/lib/i18n";

export interface StudentFormBatch {
  id: number;
  label: string;
  hscYear: string;
  tuitionFee: number;
  admissionFee: number;
}

export interface StudentFormValues {
  studentUid: string;
  name: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  collegeId: string;
  collegeRoll: string;
  hscYear: string;
  gender: string;
  division: string;
  courseType: string;
  admissionDate: string;
  admissionFee: number;
  monthlyFee: number;
  modelTestFee: number;
  batchId: string;
  isModelTest: boolean;
  comment: string;
}

export function StudentForm({
  action,
  defaults,
  batches,
  colleges,
  submitLabel,
  successMessage,
  redirectTo = "/students",
  showCollectionToggles = false,
}: {
  action: (prev: ActionResult<{ id: number }> | null, formData: FormData) => Promise<ActionResult<{ id: number }>>;
  defaults: StudentFormValues;
  batches: StudentFormBatch[];
  colleges: { id: number; label: string }[];
  submitLabel: string;
  successMessage: string;
  redirectTo?: string;
  showCollectionToggles?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null);

  const [batchId, setBatchId] = React.useState(defaults.batchId);
  const [isModelTest, setIsModelTest] = React.useState(defaults.isModelTest);
  const [fees, setFees] = React.useState({
    admissionFee: defaults.admissionFee,
    monthlyFee: defaults.monthlyFee,
    modelTestFee: defaults.modelTestFee,
  });

  const selectedBatch = batches.find((b) => String(b.id) === batchId);

  // Picking a batch pre-fills its fees; the desk can still override them.
  function onBatchChange(next: string) {
    setBatchId(next);
    const batch = batches.find((b) => String(b.id) === next);
    if (batch) {
      setFees((prev) => ({
        ...prev,
        admissionFee: batch.admissionFee,
        monthlyFee: batch.tuitionFee,
      }));
    }
  }

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(successMessage);
      router.push(redirectTo);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, successMessage, router, redirectTo]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.students.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FieldGrid columns={3}>
            <Field label={t.students.studentId} htmlFor="studentUid" required error={errors.studentUid}>
              <Input id="studentUid" name="studentUid" defaultValue={defaults.studentUid} required />
            </Field>
            <Field label={t.students.studentName} htmlFor="name" required error={errors.name}>
              <Input id="name" name="name" defaultValue={defaults.name} required />
            </Field>
            <Field label={t.common.phone} htmlFor="phone" error={errors.phone}>
              <Input id="phone" name="phone" inputMode="numeric" defaultValue={defaults.phone} placeholder="01XXXXXXXXX" />
            </Field>
          </FieldGrid>

          <FieldGrid columns={3}>
            <Field label={t.students.parentName} htmlFor="parentName" error={errors.parentName}>
              <Input id="parentName" name="parentName" defaultValue={defaults.parentName} />
            </Field>
            <Field label={t.students.parentPhone} htmlFor="parentPhone" error={errors.parentPhone}>
              <Input
                id="parentPhone"
                name="parentPhone"
                inputMode="numeric"
                defaultValue={defaults.parentPhone}
                placeholder="01XXXXXXXXX"
              />
            </Field>
            <Field label={t.students.gender} htmlFor="gender" error={errors.gender}>
              <SimpleSelect
                name="gender"
                value={defaults.gender}
                options={[
                  { value: "male", label: t.students.male },
                  { value: "female", label: t.students.female },
                  { value: "other", label: t.students.other },
                ]}
                placeholder={t.common.select}
              />
            </Field>
          </FieldGrid>

          <FieldGrid columns={3}>
            <Field label={t.students.college} htmlFor="collegeId" error={errors.collegeId}>
              <SimpleSelect
                name="collegeId"
                value={defaults.collegeId}
                options={colleges.map((c) => ({ value: String(c.id), label: c.label }))}
                placeholder={t.common.select}
              />
            </Field>
            <Field label={t.students.collegeRoll} htmlFor="collegeRoll" error={errors.collegeRoll}>
              <Input id="collegeRoll" name="collegeRoll" defaultValue={defaults.collegeRoll} />
            </Field>
            <Field label={t.students.division} htmlFor="division" error={errors.division}>
              <Input id="division" name="division" defaultValue={defaults.division} placeholder="Science" />
            </Field>
          </FieldGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.students.batch}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FieldGrid columns={3}>
            <Field label={t.students.batch} htmlFor="batchId" required error={errors.batchId}>
              <SimpleSelect
                name="batchId"
                value={batchId}
                onValueChange={onBatchChange}
                options={batches.map((b) => ({ value: String(b.id), label: b.label }))}
                placeholder={t.attendance.selectBatch}
              />
            </Field>
            <Field label={t.batches.hscYear} htmlFor="hscYear" required error={errors.hscYear}>
              <Input
                id="hscYear"
                name="hscYear"
                key={selectedBatch?.hscYear ?? defaults.hscYear}
                defaultValue={selectedBatch?.hscYear ?? defaults.hscYear}
                required
              />
            </Field>
            <Field label={t.students.admissionDate} htmlFor="admissionDate" required error={errors.admissionDate}>
              <Input id="admissionDate" name="admissionDate" type="date" defaultValue={defaults.admissionDate} required />
            </Field>
          </FieldGrid>

          <Field label={t.students.courseType} htmlFor="courseType" error={errors.courseType}>
            <Input id="courseType" name="courseType" defaultValue={defaults.courseType} placeholder="Full Course" />
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-[--radius-retro] border-2 border-line bg-surface-2 px-3 py-2.5">
            <Checkbox
              checked={isModelTest}
              onCheckedChange={(value) => setIsModelTest(Boolean(value))}
              name="isModelTest"
              value="true"
            />
            <span className="text-sm font-bold">{t.students.isModelTest}</span>
          </label>
          {isModelTest ? <input type="hidden" name="isModelTest" value="true" /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.payments.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FieldGrid columns={3}>
            <Field label={t.students.admissionFee} htmlFor="admissionFee" error={errors.admissionFee}>
              <Input
                id="admissionFee"
                name="admissionFee"
                type="number"
                min={0}
                value={fees.admissionFee}
                onChange={(e) => setFees((p) => ({ ...p, admissionFee: Number(e.target.value) }))}
              />
            </Field>

            {isModelTest ? (
              <Field label={t.students.modelTestFee} htmlFor="modelTestFee" error={errors.modelTestFee}>
                <Input
                  id="modelTestFee"
                  name="modelTestFee"
                  type="number"
                  min={0}
                  value={fees.modelTestFee}
                  onChange={(e) => setFees((p) => ({ ...p, modelTestFee: Number(e.target.value) }))}
                />
              </Field>
            ) : (
              <Field label={t.students.monthlyFee} htmlFor="monthlyFee" error={errors.monthlyFee}>
                <Input
                  id="monthlyFee"
                  name="monthlyFee"
                  type="number"
                  min={0}
                  value={fees.monthlyFee}
                  onChange={(e) => setFees((p) => ({ ...p, monthlyFee: Number(e.target.value) }))}
                />
              </Field>
            )}
            {isModelTest ? <input type="hidden" name="monthlyFee" value={0} /> : null}
          </FieldGrid>

          {showCollectionToggles && !isModelTest ? (
            <div className="space-y-2 rounded-[--radius-retro] border-2 border-dashed border-line bg-surface-2/60 p-3">
              <label className="flex cursor-pointer items-center gap-2.5">
                <Checkbox name="collectAdmissionFee" defaultChecked />
                <span className="text-sm">
                  {t.students.admissionFee} — {formatCurrency(fees.admissionFee, locale)}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5">
                <Checkbox name="collectFirstMonth" />
                <span className="text-sm">
                  {t.students.markPaidNow} — {formatCurrency(fees.monthlyFee, locale)}
                </span>
              </label>
            </div>
          ) : null}

          <Field label={t.common.comment} htmlFor="comment" error={errors.comment}>
            <Textarea id="comment" name="comment" defaultValue={defaults.comment} rows={2} />
          </Field>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            {t.common.cancel}
          </Button>
          <Button type="submit" loading={pending}>
            <Save /> {submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
