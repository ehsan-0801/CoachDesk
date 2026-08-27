"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field";
import { StudentPicker, type PickedStudent } from "@/components/ui/student-picker";

/** Picks the student whose ledger is shown; the ledger itself renders server-side. */
export function LedgerPicker({ initial }: { initial: PickedStudent | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [student, setStudent] = React.useState<PickedStudent | null>(initial);

  function onChange(next: PickedStudent | null) {
    setStudent(next);
    router.replace(next ? `/payments/ledger?student=${next.id}` : "/payments/ledger");
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t.payments.ledger}</CardTitle>
      </CardHeader>
      <CardContent>
        <Field label={t.students.studentName}>
          <StudentPicker value={student} onChange={onChange} includeArchived />
        </Field>
      </CardContent>
    </Card>
  );
}
