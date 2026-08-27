"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Confirm } from "@/components/ui/confirm";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatCurrency } from "@/lib/i18n";
import { deleteFeeType, saveFeeType } from "@/server/actions/payments";

interface FeeTypeRow {
  id: number;
  name: string;
  amount: number;
  isModelTest: boolean;
  isActive: boolean;
}

export function FeeTypesClient({
  feeTypes,
  canManage,
}: {
  feeTypes: FeeTypeRow[];
  canManage: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = React.useState<FeeTypeRow | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<FeeTypeRow | null>(null);

  return (
    <>
      {canManage ? (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus /> {t.common.add}
          </Button>
        </div>
      ) : null}

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>{t.payments.feeTypeName}</TH>
              <TH className="text-right">{t.payments.defaultAmount}</TH>
              <TH>{t.common.type}</TH>
              <TH className="w-24" />
            </TR>
          </THead>
          <TBody>
            {feeTypes.map((feeType) => (
              <TR key={feeType.id}>
                <TD className="font-medium">{feeType.name}</TD>
                <TD className="text-right font-bold tabular-nums">
                  {formatCurrency(feeType.amount, locale)}
                </TD>
                <TD>
                  {feeType.isModelTest ? (
                    <Badge variant="info">{t.payments.modelTestFee}</Badge>
                  ) : (
                    <Badge variant="neutral">{t.payments.title}</Badge>
                  )}
                </TD>
                <TD className="text-right">
                  {canManage ? (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(feeType)} aria-label={t.common.edit}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(feeType)}
                        aria-label={t.common.delete}
                        className="text-danger"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>

      {editing ? (
        <FeeTypeDialog
          feeType={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      <Confirm
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t.common.delete}
        description={deleting?.name}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          const result = await deleteFeeType(deleting!.id);
          if (result.ok) {
            toast.success(t.common.delete);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </>
  );
}

function FeeTypeDialog({
  feeType,
  onClose,
  onSaved,
}: {
  feeType: FeeTypeRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const action = saveFeeType.bind(null, feeType?.id ?? null);
  const [state, formAction, pending] = useActionState(action, null);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t.common.save);
      onSaved();
    } else {
      toast.error(state.error);
    }
  }, [state, onSaved, t]);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="sm">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{feeType ? t.common.edit : t.common.add}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label={t.payments.feeTypeName} htmlFor="name" required>
              <Input id="name" name="name" defaultValue={feeType?.name ?? ""} required />
            </Field>
            <Field label={t.payments.defaultAmount} htmlFor="amount">
              <Input id="amount" name="amount" type="number" min={0} defaultValue={feeType?.amount ?? 0} />
            </Field>
            <label className="flex cursor-pointer items-center gap-2.5">
              <Checkbox name="isModelTest" defaultChecked={feeType?.isModelTest ?? false} />
              <span className="text-sm">{t.payments.modelTestFee}</span>
            </label>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" loading={pending}>
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
