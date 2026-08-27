"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGrid } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { deletePayment, updatePayment } from "@/server/actions/payments";

export interface EditablePayment {
  id: number;
  amount: number;
  paymentDate: string;
  method: string;
  note: string | null;
  studentName: string;
}

export function PaymentRowActions({
  payment,
  canUpdate,
  canDelete,
}: {
  payment: EditablePayment;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const [draft, setDraft] = React.useState({
    amount: String(payment.amount),
    paymentDate: payment.paymentDate,
    method: payment.method,
    note: payment.note ?? "",
  });

  if (!canUpdate && !canDelete) return null;

  function save() {
    startTransition(async () => {
      const result = await updatePayment(payment.id, {
        amount: Number(draft.amount),
        paymentDate: draft.paymentDate,
        method: draft.method,
        note: draft.note,
      });
      if (result.ok) {
        toast.success(t.payments.updated);
        setEditing(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t.common.actions}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate ? (
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil /> {t.common.edit}
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <>
              {canUpdate ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem destructive onSelect={() => setConfirmingDelete(true)}>
                <Trash2 /> {t.common.delete}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t.common.edit}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <FieldGrid columns={2}>
              <Field label={t.common.amount} htmlFor={`amount-${payment.id}`}>
                <Input
                  id={`amount-${payment.id}`}
                  type="number"
                  min={1}
                  value={draft.amount}
                  onChange={(event) => setDraft((prev) => ({ ...prev, amount: event.target.value }))}
                />
              </Field>
              <Field label={t.payments.paymentDate} htmlFor={`date-${payment.id}`}>
                <Input
                  id={`date-${payment.id}`}
                  type="date"
                  value={draft.paymentDate}
                  onChange={(event) => setDraft((prev) => ({ ...prev, paymentDate: event.target.value }))}
                />
              </Field>
            </FieldGrid>
            <Field label={t.payments.paymentMethod}>
              <SimpleSelect
                value={draft.method}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, method: value }))}
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
            <Field label={t.common.comment}>
              <Textarea
                rows={2}
                value={draft.note}
                onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {t.common.cancel}
            </Button>
            <Button loading={pending} onClick={save}>
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Confirm
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={t.common.delete}
        description={payment.studentName}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          const result = await deletePayment(payment.id);
          if (result.ok) {
            toast.success(t.payments.deleted);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </>
  );
}
