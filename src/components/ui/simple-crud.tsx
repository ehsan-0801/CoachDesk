"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import type { ActionResult } from "@/lib/action-result";
import { formatNumber } from "@/lib/i18n";

export interface SimpleRow {
  id: number;
  name: string;
  /** Optional secondary field, e.g. a short name. */
  secondary?: string | null;
  /** Usage count, shown as a badge and used to explain a blocked delete. */
  usageCount?: number;
}

/**
 * Name-only reference lists (expense types, colleges). One component covers
 * them because the shape is identical: add a row, list rows, delete a row.
 */
export function SimpleCrud({
  rows,
  createAction,
  deleteAction,
  labels,
  canCreate,
  canDelete,
  secondaryLabel,
}: {
  rows: SimpleRow[];
  createAction: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  deleteAction: (id: number) => Promise<ActionResult>;
  labels: { nameLabel: string; addLabel: string; emptyLabel: string; usageLabel: string };
  canCreate: boolean;
  canDelete: boolean;
  secondaryLabel?: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createAction, null);
  const [deleting, setDeleting] = React.useState<SimpleRow | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t.common.save);
      formRef.current?.reset();
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, t, router]);

  return (
    <div className="space-y-4">
      {canCreate ? (
        <Card>
          <CardContent>
            <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
              <Field label={labels.nameLabel} htmlFor="name" required className="min-w-56 flex-1">
                <Input id="name" name="name" required />
              </Field>
              {secondaryLabel ? (
                <Field label={secondaryLabel} htmlFor="shortName" className="w-40">
                  <Input id="shortName" name="shortName" />
                </Field>
              ) : null}
              <Button type="submit" loading={pending}>
                <Plus /> {labels.addLabel}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title={labels.emptyLabel} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>{labels.nameLabel}</TH>
                {secondaryLabel ? <TH>{secondaryLabel}</TH> : null}
                <TH className="text-right">{labels.usageLabel}</TH>
                <TH className="w-12" />
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="font-medium">{row.name}</TD>
                  {secondaryLabel ? <TD className="text-muted">{row.secondary ?? "—"}</TD> : null}
                  <TD className="text-right">
                    <Badge variant={row.usageCount ? "secondary" : "neutral"}>
                      {formatNumber(row.usageCount ?? 0, locale)}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-danger"
                        onClick={() => setDeleting(row)}
                        aria-label={t.common.delete}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      <Confirm
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t.common.delete}
        description={deleting?.name}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          const result = await deleteAction(deleting!.id);
          if (result.ok) {
            toast.success(t.common.delete);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </div>
  );
}
