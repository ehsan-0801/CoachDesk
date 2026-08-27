"use client";

import { Wallet } from "lucide-react";
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
import { StudentPicker, type PickedStudent } from "@/components/ui/student-picker";
import { MONTH_NAMES, formatCurrency, formatNumber } from "@/lib/i18n";
import { recordPayment } from "@/server/actions/payments";

export function PaymentForm({
  feeTypes,
  today,
}: {
  feeTypes: { id: number; name: string; amount: number; isModelTest: boolean }[];
  today: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(recordPayment, null);

  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [paymentType, setPaymentType] = React.useState(feeTypes[0]?.name ?? "");
  const [amount, setAmount] = React.useState(String(feeTypes[0]?.amount ?? 0));
  const [method, setMethod] = React.useState("cash");

  const now = new Date();
  const [month, setMonth] = React.useState(String(now.getMonth() + 1));
  const [year, setYear] = React.useState(String(now.getFullYear()));

  // Choosing a fee type pre-fills its standard amount; the desk can override it
  // for part-payments, which are common.
  function onFeeTypeChange(next: string) {
    setPaymentType(next);
    const feeType = feeTypes.find((f) => f.name === next);
    if (feeType) setAmount(String(feeType.amount));
  }

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t.payments.saved);
      setStudent(null);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, t, router]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const isMonthly = feeTypes.find((f) => f.name === paymentType)?.name.includes("মাসিক") ?? false;

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>{t.payments.record}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={t.students.studentName} required error={errors.studentId}>
            <StudentPicker value={student} onChange={setStudent} name="studentId" />
          </Field>

          <FieldGrid columns={3}>
            <Field label={t.payments.paymentType} required error={errors.paymentType}>
              <SimpleSelect
                name="paymentType"
                value={paymentType}
                onValueChange={onFeeTypeChange}
                options={feeTypes.map((f) => ({
                  value: f.name,
                  label: `${f.name} — ${formatCurrency(f.amount, locale)}`,
                }))}
                placeholder={t.common.select}
              />
            </Field>
            <Field label={t.common.amount} htmlFor="amount" required error={errors.amount}>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </Field>
            <Field label={t.payments.paymentDate} htmlFor="paymentDate" required error={errors.paymentDate}>
              <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} required />
            </Field>
          </FieldGrid>

          <FieldGrid columns={3}>
            <Field label={t.payments.paymentMonth} error={errors.paymentMonth}>
              <SimpleSelect
                name="paymentMonth"
                value={month}
                onValueChange={setMonth}
                disabled={!isMonthly}
                options={MONTH_NAMES[locale].map((label, index) => ({ value: String(index + 1), label }))}
              />
            </Field>
            <Field label={t.common.year} error={errors.paymentYear}>
              <SimpleSelect
                name="paymentYear"
                value={year}
                onValueChange={setYear}
                disabled={!isMonthly}
                options={years.map((y) => ({ value: String(y), label: formatNumber(y, locale) }))}
              />
            </Field>
            <Field label={t.payments.paymentMethod} error={errors.method}>
              <SimpleSelect
                name="method"
                value={method}
                onValueChange={setMethod}
                options={[
                  { value: "cash", label: t.payments.cash },
                  { value: "bkash", label: t.payments.bkash },
                  { value: "nagad", label: t.payments.nagad },
                  { value: "rocket", label: t.payments.rocket },
                  { value: "bank", label: t.payments.bank },
                  { value: "other", label: t.payments.other },
                ]}
              />
            </Field>
          </FieldGrid>

          <Field label={t.common.comment} htmlFor="note">
            <Textarea id="note" name="note" rows={2} />
          </Field>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" loading={pending} disabled={!student}>
            <Wallet /> {t.payments.record}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
