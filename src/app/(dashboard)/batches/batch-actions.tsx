"use client";

import { Archive, ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteBatch, setBatchArchived } from "@/server/actions/batches";

export function BatchRowActions({
  batch,
  canUpdate,
  canDelete,
}: {
  batch: { id: number; archived: boolean; studentCount: number };
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirming, setConfirming] = React.useState<"archive" | "delete" | null>(null);

  async function run(promise: Promise<{ ok: boolean; error?: string }>, success: string) {
    const result = await promise;
    if (result.ok) {
      toast.success(success);
      router.refresh();
    } else {
      toast.error(result.error ?? t.common.error);
    }
    setConfirming(null);
  }

  if (!canUpdate && !canDelete) return null;

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
            <DropdownMenuItem asChild>
              <Link href={`/batches/${batch.id}`}>
                <Pencil /> {t.common.edit}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {canUpdate ? (
            <DropdownMenuItem onSelect={() => setConfirming("archive")}>
              {batch.archived ? <ArchiveRestore /> : <Archive />}
              {batch.archived ? t.common.unarchive : t.common.archive}
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setConfirming("delete")}>
                <Trash2 /> {t.common.delete}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* The dropdown unmounts on select, so the dialogs are controlled from here. */}
      <Confirm
        open={confirming === "archive"}
        onOpenChange={(next) => setConfirming(next ? "archive" : null)}
        title={batch.archived ? t.common.unarchive : t.common.archive}
        description={batch.archived ? t.batches.unarchiveWarning : t.batches.archiveWarning}
        confirmLabel={batch.archived ? t.common.unarchive : t.common.archive}
        variant={batch.archived ? "primary" : "danger"}
        onConfirm={() =>
          run(
            setBatchArchived(batch.id, !batch.archived),
            batch.archived ? t.batches.restoredToast : t.batches.archivedToast,
          )
        }
      />

      <Confirm
        open={confirming === "delete"}
        onOpenChange={(next) => setConfirming(next ? "delete" : null)}
        title={t.common.delete}
        description={
          batch.studentCount > 0
            ? t.batches.archiveWarning
            : undefined
        }
        confirmLabel={t.common.delete}
        onConfirm={() => run(deleteBatch(batch.id), t.batches.deleted)}
      />
    </>
  );
}
