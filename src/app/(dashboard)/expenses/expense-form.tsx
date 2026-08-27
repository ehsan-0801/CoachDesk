"use client";

import { Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGrid } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { saveExpense } from "@/server/actions/expenses";

export function ExpenseForm({
  expenseTypes,
  notes,
  today,
  redirectTo = "/expenses",
}: {
  expenseTypes: { id: number; name: string }[];
  notes: { id: number; name: string }[];
  today: string;
  redirectTo?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const action = saveExpense.bind(null, null);
  const [state, formAction, pending] = useActionState(action, null);
  const [noteId, setNoteId] = React.useState("");

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t.expenses.saved);
      router.push(redirectTo);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, t, router, redirectTo]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>{t.expenses.record}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FieldGrid columns={3}>
            <Field label={t.expenses.expenseType} required error={errors.expenseTypeId}>
              <SimpleSelect
                name="expenseTypeId"
                options={expenseTypes.map((type) => ({ value: String(type.id), label: type.name }))}
                placeholder={t.common.select}
              />
            </Field>
            <Field label={t.expenses.expenseAmount} htmlFor="amount" required error={errors.amount}>
              <Input id="amount" name="amount" type="number" min={1} step="0.01" required />
            </Field>
            <Field label={t.expenses.expenseDate} htmlFor="expenseDate" required error={errors.expenseDate}>
              <Input id="expenseDate" name="expenseDate" type="date" defaultValue={today} required />
            </Field>
          </FieldGrid>

          <FieldGrid columns={3}>
            <Field
              label={t.expenses.linkedNote}
              hint={noteId ? t.expenses.linkedNote : undefined}
            >
              <SimpleSelect
                name="noteId"
                value={noteId}
                onValueChange={setNoteId}
                options={[
                  { value: "", label: "—" },
                  ...notes.map((note) => ({ value: String(note.id), label: note.name })),
                ]}
                placeholder="—"
              />
            </Field>
            <Field label={t.expenses.unitsObtained} htmlFor="quantity" error={errors.quantity}>
              <Input id="quantity" name="quantity" type="number" min={0} disabled={!noteId} />
            </Field>
            <Field label={t.expenses.printType} htmlFor="printType">
              <Input id="printType" name="printType" placeholder="Offset" />
            </Field>
          </FieldGrid>

          <Field label={t.common.description} htmlFor="description">
            <Textarea id="description" name="description" rows={2} />
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            {t.common.cancel}
          </Button>
          <Button type="submit" loading={pending}>
            <Receipt /> {t.common.save}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
