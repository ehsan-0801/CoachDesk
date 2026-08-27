"use client";

import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
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
import { Field, FieldGrid } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatDateShort } from "@/lib/i18n";
import type { PermissionMap } from "@/lib/rbac";
import { createUser, deleteUser, updateUser } from "@/server/actions/users";

import { PermissionMatrix } from "./permission-matrix";

export interface UserRow {
  id: number;
  name: string;
  email: string;
  role: "admin" | "manager" | "staff";
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  permissions: PermissionMap;
  moduleCount: number;
}

export function UsersClient({ users }: { users: UserRow[] }) {
  const { t, locale } = useI18n();
  const session = useSession();
  const router = useRouter();
  const [editing, setEditing] = React.useState<UserRow | "new" | null>(null);
  const [permissionsFor, setPermissionsFor] = React.useState<UserRow | null>(null);
  const [deleting, setDeleting] = React.useState<UserRow | null>(null);

  const roleLabels = { admin: t.users.admin, manager: t.users.manager, staff: t.users.staff };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus /> {t.users.createUser}
        </Button>
      </div>

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>{t.common.name}</TH>
              <TH>{t.auth.email}</TH>
              <TH>{t.users.role}</TH>
              <TH className="text-right">{t.users.permissions}</TH>
              <TH>{t.users.lastLogin}</TH>
              <TH>{t.common.status}</TH>
              <TH className="w-32" />
            </TR>
          </THead>
          <TBody>
            {users.map((user) => (
              <TR key={user.id}>
                <TD className="font-medium">
                  {user.name}
                  {user.id === session?.id ? (
                    <Badge variant="outline" className="ml-1.5">
                      {t.nav.profile}
                    </Badge>
                  ) : null}
                </TD>
                <TD className="text-muted">{user.email}</TD>
                <TD>
                  <Badge variant={user.role === "admin" ? "primary" : user.role === "manager" ? "secondary" : "neutral"}>
                    {roleLabels[user.role]}
                  </Badge>
                </TD>
                <TD className="text-right">
                  {user.role === "admin" ? (
                    <Badge variant="success">{t.common.all}</Badge>
                  ) : (
                    <Badge variant="neutral">{user.moduleCount}</Badge>
                  )}
                </TD>
                <TD className="whitespace-nowrap text-muted">
                  {user.lastLoginAt ? formatDateShort(user.lastLoginAt, locale) : t.users.never}
                </TD>
                <TD>
                  <Badge variant={user.isActive ? "success" : "danger"}>
                    {user.isActive ? t.common.active : t.common.inactive}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setPermissionsFor(user)}
                      aria-label={t.users.permissions}
                    >
                      <KeyRound />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(user)} aria-label={t.common.edit}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-danger"
                      disabled={user.id === session?.id}
                      onClick={() => setDeleting(user)}
                      aria-label={t.common.delete}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>

      {editing ? (
        <UserDialog
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      {permissionsFor ? (
        <PermissionMatrix user={permissionsFor} onClose={() => setPermissionsFor(null)} />
      ) : null}

      <Confirm
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t.common.delete}
        description={deleting?.email}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          const result = await deleteUser(deleting!.id);
          if (result.ok) {
            toast.success(t.users.deleted);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </>
  );
}

function UserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const action = user ? updateUser.bind(null, user.id) : createUser;
  const [state, formAction, pending] = useActionState(action, null);
  const [isActive, setIsActive] = React.useState(user?.isActive ?? true);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(user ? t.users.updated : t.users.created);
      onSaved();
    } else {
      toast.error(state.error);
    }
  }, [state, onSaved, t, user]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{user ? t.users.editUser : t.users.createUser}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <FieldGrid columns={2}>
              <Field label={t.common.name} htmlFor="name" required error={errors.name}>
                <Input id="name" name="name" defaultValue={user?.name ?? ""} required />
              </Field>
              <Field label={t.auth.email} htmlFor="email" required error={errors.email}>
                <Input id="email" name="email" type="email" defaultValue={user?.email ?? ""} required />
              </Field>
            </FieldGrid>

            <FieldGrid columns={2}>
              <Field label={t.users.role} required error={errors.role}>
                <SimpleSelect
                  name="role"
                  value={user?.role ?? "staff"}
                  options={[
                    { value: "admin", label: t.users.admin },
                    { value: "manager", label: t.users.manager },
                    { value: "staff", label: t.users.staff },
                  ]}
                />
              </Field>
              <Field label={t.common.phone} htmlFor="phone">
                <Input id="phone" name="phone" defaultValue={user?.phone ?? ""} />
              </Field>
            </FieldGrid>

            <Field
              label={t.auth.password}
              htmlFor="password"
              required={!user}
              hint={user ? t.users.passwordHint : undefined}
              error={errors.password}
            >
              <Input id="password" name="password" type="password" autoComplete="new-password" />
            </Field>

            <label className="flex cursor-pointer items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm font-bold">{t.common.active}</span>
            </label>
            <input type="hidden" name="isActive" value={isActive ? "on" : "off"} />
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
