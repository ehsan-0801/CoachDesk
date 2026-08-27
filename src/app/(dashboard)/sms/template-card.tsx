"use client";

import { RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { SmsCategory } from "@/lib/types";
import { resetSmsTemplate, saveSmsTemplate } from "@/server/actions/sms";

export interface TemplateCardProps {
  category: SmsCategory;
  isActive: boolean;
  studentTemplate: string;
  parentTemplate: string | null;
  sendToStudent: boolean;
  sendToParent: boolean;
  sendToTest: boolean;
  testPhone: string | null;
  placeholders: readonly string[];
  canUpdate: boolean;
}

export function TemplateCard(props: TemplateCardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const action = saveSmsTemplate.bind(null, props.category);
  const [state, formAction, pending] = useActionState(action, null);

  const [isActive, setIsActive] = React.useState(props.isActive);
  const [toStudent, setToStudent] = React.useState(props.sendToStudent);
  const [toParent, setToParent] = React.useState(props.sendToParent);
  const [toTest, setToTest] = React.useState(props.sendToTest);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t.homepage.saved);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, t, router]);

  const categoryLabel = t.sms.categories[props.category as keyof typeof t.sms.categories] ?? props.category;

  return (
    <form action={formAction}>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{categoryLabel}</CardTitle>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} disabled={!props.canUpdate} />
            <span className="text-xs font-bold uppercase text-muted">{t.sms.enabled}</span>
          </label>
          <input type="hidden" name="isActive" value={isActive ? "on" : "off"} />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {props.placeholders.map((placeholder) => (
              <Badge key={placeholder} variant="outline" className="font-mono text-[10px]">
                {`{${placeholder}}`}
              </Badge>
            ))}
          </div>

          <Field label={t.sms.studentTemplate} htmlFor={`student-${props.category}`}>
            <Textarea
              id={`student-${props.category}`}
              name="studentTemplate"
              rows={3}
              defaultValue={props.studentTemplate}
              disabled={!props.canUpdate}
            />
          </Field>

          <Field label={t.sms.parentTemplate} htmlFor={`parent-${props.category}`}>
            <Textarea
              id={`parent-${props.category}`}
              name="parentTemplate"
              rows={3}
              defaultValue={props.parentTemplate ?? ""}
              disabled={!props.canUpdate}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <Switch checked={toStudent} onCheckedChange={setToStudent} disabled={!props.canUpdate} />
              <span className="text-sm">{t.sms.sendToStudent}</span>
            </label>
            <input type="hidden" name="sendToStudent" value={toStudent ? "on" : "off"} />

            <label className="flex cursor-pointer items-center gap-2">
              <Switch checked={toParent} onCheckedChange={setToParent} disabled={!props.canUpdate} />
              <span className="text-sm">{t.sms.sendToParent}</span>
            </label>
            <input type="hidden" name="sendToParent" value={toParent ? "on" : "off"} />

            <label className="flex cursor-pointer items-center gap-2">
              <Switch checked={toTest} onCheckedChange={setToTest} disabled={!props.canUpdate} />
              <span className="text-sm">{t.sms.sendToTest}</span>
            </label>
            <input type="hidden" name="sendToTest" value={toTest ? "on" : "off"} />
          </div>

          {toTest ? (
            <Field label={t.sms.testPhone} htmlFor={`test-${props.category}`}>
              <Input
                id={`test-${props.category}`}
                name="testPhone"
                defaultValue={props.testPhone ?? ""}
                placeholder="01XXXXXXXXX"
                className="sm:max-w-xs"
                disabled={!props.canUpdate}
              />
            </Field>
          ) : (
            <input type="hidden" name="testPhone" value={props.testPhone ?? ""} />
          )}
        </CardContent>

        {props.canUpdate ? (
          <CardFooter className="justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                const result = await resetSmsTemplate(props.category);
                if (result.ok) {
                  toast.success(t.common.reset);
                  router.refresh();
                } else {
                  toast.error(result.error);
                }
              }}
            >
              <RotateCcw /> {t.common.reset}
            </Button>
            <Button type="submit" size="sm" loading={pending}>
              <Save /> {t.common.save}
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </form>
  );
}
