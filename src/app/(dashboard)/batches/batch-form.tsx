"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGrid } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { WEEKDAY_KEYS } from "@/lib/i18n/config";
import { formatWeekdayKey } from "@/lib/i18n";
import type { ActionResult } from "@/lib/action-result";

export interface BatchFormValues {
  batchNumber: number;
  name: string | null;
  hscYear: string;
  daysInWeek: string[];
  startTime: string;
  endTime: string;
  startingDate: string;
  duration: string | null;
  tuitionFee: number;
  admissionFee: number;
}

export function BatchForm({
  action,
  defaults,
  submitLabel,
  successMessage,
  redirectTo = "/batches",
}: {
  action: (prev: ActionResult<{ id: number }> | null, formData: FormData) => Promise<ActionResult<{ id: number }>>;
  defaults: BatchFormValues;
  submitLabel: string;
  successMessage: string;
  redirectTo?: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null);
  const [days, setDays] = React.useState<string[]>(defaults.daysInWeek);

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
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-5">
          <FieldGrid columns={3}>
            <Field label={t.batches.batchNumber} htmlFor="batchNumber" required error={errors.batchNumber}>
              <Input id="batchNumber" name="batchNumber" type="number" min={1} defaultValue={defaults.batchNumber} required />
            </Field>
            <Field label={t.batches.batchName} htmlFor="name" error={errors.name}>
              <Input id="name" name="name" defaultValue={defaults.name ?? ""} placeholder="HSC 2027 — Morning" />
            </Field>
            <Field label={t.batches.hscYear} htmlFor="hscYear" required error={errors.hscYear}>
              <Input id="hscYear" name="hscYear" defaultValue={defaults.hscYear} placeholder="2027" required />
            </Field>
          </FieldGrid>

          <Field label={t.batches.days} required error={errors.daysInWeek}>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_KEYS.map((key) => {
                const checked = days.includes(key);
                return (
                  <label
                    key={key}
                    className={`retro-press flex cursor-pointer items-center gap-2 rounded-[--radius-retro] border-2 border-line px-3 py-1.5 text-sm font-bold retro-shadow-sm ${
                      checked ? "bg-primary text-primary-ink" : "bg-surface"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        setDays((prev) => (value ? [...prev, key] : prev.filter((d) => d !== key)))
                      }
                      className="size-4"
                    />
                    {formatWeekdayKey(key, locale, true)}
                  </label>
                );
              })}
            </div>
            {days.map((day) => (
              <input key={day} type="hidden" name="daysInWeek" value={day} />
            ))}
          </Field>

          <FieldGrid columns={3}>
            <Field label={t.batches.startTime} htmlFor="startTime" required error={errors.startTime}>
              <Input id="startTime" name="startTime" type="time" defaultValue={defaults.startTime} required />
            </Field>
            <Field label={t.batches.endTime} htmlFor="endTime" required error={errors.endTime}>
              <Input id="endTime" name="endTime" type="time" defaultValue={defaults.endTime} required />
            </Field>
            <Field label={t.batches.startingDate} htmlFor="startingDate" required error={errors.startingDate}>
              <Input id="startingDate" name="startingDate" type="date" defaultValue={defaults.startingDate} required />
            </Field>
          </FieldGrid>

          <FieldGrid columns={3}>
            <Field label={t.batches.tuitionFee} htmlFor="tuitionFee" required error={errors.tuitionFee}>
              <Input id="tuitionFee" name="tuitionFee" type="number" min={0} defaultValue={defaults.tuitionFee} required />
            </Field>
            <Field label={t.batches.admissionFee} htmlFor="admissionFee" required error={errors.admissionFee}>
              <Input id="admissionFee" name="admissionFee" type="number" min={0} defaultValue={defaults.admissionFee} required />
            </Field>
            <Field label={t.batches.duration} htmlFor="duration" error={errors.duration}>
              <Input id="duration" name="duration" defaultValue={defaults.duration ?? ""} placeholder="12 months" />
            </Field>
          </FieldGrid>
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
