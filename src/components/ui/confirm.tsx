"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/components/providers/i18n-provider";

/**
 * Confirmation step for destructive actions, so the copy and button emphasis
 * stay consistent everywhere.
 *
 * Uncontrolled: pass `children` as the trigger.
 * Controlled: pass `open` / `onOpenChange` and omit `children` — needed when the
 * trigger lives in a dropdown, which unmounts the moment an item is selected.
 */
export function Confirm({
  title,
  description,
  confirmLabel,
  onConfirm,
  variant = "danger",
  open,
  onOpenChange,
  body,
  confirmDisabled = false,
  children,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "danger" | "primary";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Extra content between the description and the buttons — e.g. a required
   *  choice the confirmation depends on. */
  body?: React.ReactNode;
  /** Blocks the confirm button while a required choice is still missing. */
  confirmDisabled?: boolean;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      {children ? <AlertDialogTrigger asChild>{children}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        {body ? <div className="mt-4">{body}</div> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={pending || confirmDisabled}
            onClick={(event) => {
              event.preventDefault();
              startTransition(async () => {
                await onConfirm();
                setOpen(false);
              });
            }}
          >
            {confirmLabel ?? t.common.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
