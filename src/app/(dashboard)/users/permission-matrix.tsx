"use client";

import { Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { APP_MODULES, PERMISSION_ACTIONS, type PermissionAction, type PermissionMap } from "@/lib/rbac";
import type { AppModule } from "@/lib/types";
import { updatePermissions } from "@/server/actions/users";

/**
 * The module × action grid. Admins are shown as fully granted and read-only:
 * their access is decided by role, so an editable row here would imply a
 * restriction the guard would never honour.
 */
export function PermissionMatrix({
  user,
  onClose,
}: {
  user: { id: number; name: string; role: string; permissions: PermissionMap };
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [map, setMap] = React.useState<PermissionMap>(user.permissions);
  const [pending, startTransition] = React.useTransition();

  const isAdmin = user.role === "admin";

  const moduleLabels: Record<AppModule, string> = {
    dashboard: t.nav.dashboard,
    batches: t.nav.batches,
    students: t.nav.students,
    attendance: t.nav.attendance,
    exams: t.nav.exams,
    notes: t.nav.notes,
    payments: t.nav.payments,
    expenses: t.nav.expenses,
    colleges: t.nav.colleges,
    homepage: t.nav.homepage,
    sms: t.nav.sms,
    users: t.nav.users,
  };

  const actionLabels: Record<PermissionAction, string> = {
    view: t.users.canView,
    create: t.users.canCreate,
    update: t.users.canUpdate,
    delete: t.users.canDelete,
  };

  function toggle(module: AppModule, action: PermissionAction, checked: boolean) {
    setMap((prev) => {
      const current = new Set(prev[module] ?? []);
      if (checked) {
        current.add(action);
        // Any grant is meaningless without being able to open the screen.
        current.add("view");
      } else {
        current.delete(action);
        // Removing `view` removes everything: the module becomes unreachable.
        if (action === "view") current.clear();
      }
      return { ...prev, [module]: [...current] };
    });
  }

  function save() {
    startTransition(async () => {
      const result = await updatePermissions(user.id, map);
      if (result.ok) {
        toast.success(t.users.updated);
        onClose();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {t.users.permissions} — {user.name}
          </DialogTitle>
          <DialogDescription>{t.users.permissionsHint}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          {isAdmin ? (
            <p className="mb-4 flex items-center gap-2 rounded-[--radius-retro] border-2 border-line bg-success/25 px-3 py-2 text-sm font-bold">
              <ShieldCheck className="size-4" /> {t.users.admin} — {t.common.all}
            </p>
          ) : null}

          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>{t.users.module}</TH>
                  {PERMISSION_ACTIONS.map((action) => (
                    <TH key={action} className="w-20 text-center">
                      {actionLabels[action]}
                    </TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {APP_MODULES.map((module) => (
                  <TR key={module}>
                    <TD className="font-medium">{moduleLabels[module]}</TD>
                    {PERMISSION_ACTIONS.map((action) => (
                      <TD key={action} className="text-center">
                        <Checkbox
                          checked={isAdmin || (map[module]?.includes(action) ?? false)}
                          disabled={isAdmin}
                          onCheckedChange={(value) => toggle(module, action, Boolean(value))}
                          aria-label={`${moduleLabels[module]} — ${actionLabels[action]}`}
                        />
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button loading={pending} disabled={isAdmin} onClick={save}>
            <Save /> {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
