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
import { formatNumber } from "@/lib/i18n";
import { updateBatchShowcase } from "@/server/actions/batches";

export interface ShowcaseBatch {
  id: number;
  label: string;
  hscYear: string;
  infoLine1: string | null;
  infoLine2: string | null;
  hscYearColor: string | null;
  infoLine1Color: string | null;
  infoLine2Color: string | null;
}

export function BatchInfoClient({ batches }: { batches: ShowcaseBatch[] }) {
  const { t } = useI18n();

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {batches.map((batch) => (
        <ShowcaseCard key={batch.id} batch={batch} />
      ))}
      {batches.length === 0 ? <p className="text-sm text-muted">{t.batches.empty}</p> : null}
    </div>
  );
}

function ShowcaseCard({ batch }: { batch: ShowcaseBatch }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [draft, setDraft] = React.useState({
    infoLine1: batch.infoLine1 ?? "",
    infoLine2: batch.infoLine2 ?? "",
    hscYearColor: batch.hscYearColor ?? "#f5b700",
    infoLine1Color: batch.infoLine1Color ?? "#1c1917",
    infoLine2Color: batch.infoLine2Color ?? "#6b6257",
  });

  function save() {
    startTransition(async () => {
      const result = await updateBatchShowcase(batch.id, {
        infoLine1: draft.infoLine1 || null,
        infoLine2: draft.infoLine2 || null,
        hscYearColor: draft.hscYearColor,
        infoLine1Color: draft.infoLine1Color,
        infoLine2Color: draft.infoLine2Color,
      });
      if (result.ok) {
        toast.success(t.homepage.saved);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{batch.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live preview of exactly what the public homepage will render. */}
        <div className="rounded-[--radius-retro] border-2 border-line bg-surface-2 p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: draft.hscYearColor }}>
            HSC {formatNumber(batch.hscYear, locale)}
          </p>
          <p className="mt-1 font-bold" style={{ color: draft.infoLine1Color }}>
            {draft.infoLine1 || "—"}
          </p>
          <p className="text-sm" style={{ color: draft.infoLine2Color }}>
            {draft.infoLine2 || "—"}
          </p>
        </div>

        <FieldGrid columns={2}>
          <Field label={t.batches.infoLine1} htmlFor={`l1-${batch.id}`}>
            <Input
              id={`l1-${batch.id}`}
              value={draft.infoLine1}
              onChange={(event) => setDraft((prev) => ({ ...prev, infoLine1: event.target.value }))}
            />
          </Field>
          <Field label={t.batches.infoLine2} htmlFor={`l2-${batch.id}`}>
            <Input
              id={`l2-${batch.id}`}
              value={draft.infoLine2}
              onChange={(event) => setDraft((prev) => ({ ...prev, infoLine2: event.target.value }))}
            />
          </Field>
        </FieldGrid>

        <FieldGrid columns={3}>
          {(
            [
              ["hscYearColor", t.batches.hscYear],
              ["infoLine1Color", t.batches.infoLine1],
              ["infoLine2Color", t.batches.infoLine2],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} htmlFor={`${key}-${batch.id}`}>
              <Input
                id={`${key}-${batch.id}`}
                type="color"
                value={draft[key]}
                onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                className="h-10 px-1"
              />
            </Field>
          ))}
        </FieldGrid>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" loading={pending} onClick={save}>
          <Save /> {t.common.save}
        </Button>
      </CardFooter>
    </Card>
  );
}
