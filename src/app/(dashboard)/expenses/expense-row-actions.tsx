"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { deleteExpense } from "@/server/actions/expenses";

export function ExpenseRowActions({
  id,
  label,
  canDelete,
}: {
  id: number;
  label: string;
  canDelete: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();

  if (!canDelete) return null;

  return (
    <Confirm
      title={t.common.delete}
      description={label}
      confirmLabel={t.common.delete}
      onConfirm={async () => {
        const result = await deleteExpense(id);
        if (result.ok) {
          toast.success(t.expenses.deleted);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }}
    >
      <Button variant="ghost" size="icon-sm" className="text-danger" aria-label={t.common.delete}>
        <Trash2 />
      </Button>
    </Confirm>
  );
}
