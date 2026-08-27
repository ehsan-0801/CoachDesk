"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { formatNumber } from "@/lib/i18n";
import { queueBatchBroadcast } from "@/server/actions/sms";

export function BroadcastClient({
  batches,
}: {
  batches: { id: number; label: string; studentCount: number }[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [batchId, setBatchId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const batch = batches.find((b) => String(b.id) === batchId);

  function submit() {
    startTransition(async () => {
      const result = await queueBatchBroadcast(Number(batchId), message);
      if (result.ok) {
        const composed = result.data?.composed ?? 0;
        toast.success(
          composed > 0
            ? `${t.sms.queued}: ${formatNumber(composed, locale)} — ${t.sms.skippedDisabled}`
            : (result.message ?? t.sms.skippedDisabled),
        );
        setMessage("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{t.sms.batchwise}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label={t.attendance.selectBatch} required>
          <SimpleSelect
            value={batchId}
            onValueChange={setBatchId}
            placeholder={t.attendance.selectBatch}
            options={batches.map((b) => ({
              value: String(b.id),
              label: `${b.label} (${formatNumber(b.studentCount, locale)})`,
            }))}
          />
        </Field>

        <Field
          label={t.sms.broadcastMessage}
          htmlFor="message"
          hint={`${formatNumber(message.length, locale)} / ${formatNumber(320, locale)}`}
        >
          <Textarea
            id="message"
            rows={4}
            maxLength={320}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </Field>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-sm text-muted">
          {batch ? `${formatNumber(batch.studentCount, locale)} ${t.students.title}` : ""}
        </span>
        <Button loading={pending} disabled={!batchId || !message.trim()} onClick={submit}>
          <Send /> {t.sms.queued}
        </Button>
      </CardFooter>
    </Card>
  );
}
