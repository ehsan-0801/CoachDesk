"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGrid } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/server/actions/users";

export function ProfileForm({
  defaults,
}: {
  defaults: { name: string; email: string; phone: string; role: string };
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProfile, null);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t.users.updated);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, t, router]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t.nav.profile}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FieldGrid columns={2}>
            <Field label={t.common.name} htmlFor="name" required error={errors.name}>
              <Input id="name" name="name" defaultValue={defaults.name} required />
            </Field>
            <Field label={t.common.phone} htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={defaults.phone} />
            </Field>
          </FieldGrid>

          <FieldGrid columns={2}>
            <Field label={t.auth.email}>
              {/* Changing an email is an admin action: it is the login identity. */}
              <Input value={defaults.email} disabled readOnly />
            </Field>
            <Field label={t.users.role}>
              <Input value={defaults.role} disabled readOnly />
            </Field>
          </FieldGrid>

          <div className="rounded-[--radius-retro] border-2 border-dashed border-line bg-surface-2/60 p-4">
            <FieldGrid columns={2}>
              <Field
                label={t.auth.password}
                htmlFor="currentPassword"
                error={errors.currentPassword}
              >
                <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
              </Field>
              <Field
                label={`${t.auth.password} (${t.common.next})`}
                htmlFor="newPassword"
                hint={t.users.passwordHint}
                error={errors.newPassword}
              >
                <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
              </Field>
            </FieldGrid>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" loading={pending}>
            <Save /> {t.common.save}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
