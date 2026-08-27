"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
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
import { EmptyState } from "@/components/ui/misc";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatNumber } from "@/lib/i18n";
import { deleteNote, saveNote } from "@/server/actions/notes";

export interface NoteRow {
  id: number;
  name: string;
  quantity: number;
  distributedCount: number;
}

export function NotesClient({
  notes,
  canCreate,
  canUpdate,
  canDelete,
}: {
  notes: NoteRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = React.useState<NoteRow | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<NoteRow | null>(null);

  return (
    <>
      {canCreate ? (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus /> {t.nav.noteCreate}
          </Button>
        </div>
      ) : null}

      {notes.length === 0 ? (
        <EmptyState title={t.notes.empty} />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>{t.notes.noteName}</TH>
                <TH className="text-right">{t.notes.inStock}</TH>
                <TH className="text-right">{t.notes.distributedCount}</TH>
                <TH className="w-24" />
              </TR>
            </THead>
            <TBody>
              {notes.map((note) => (
                <TR key={note.id}>
                  <TD className="font-medium">{note.name}</TD>
                  <TD className="text-right">
                    <Badge variant={note.quantity > 10 ? "success" : note.quantity > 0 ? "warning" : "danger"}>
                      {formatNumber(note.quantity, locale)}
                    </Badge>
                  </TD>
                  <TD className="text-right tabular-nums text-muted">
                    {formatNumber(note.distributedCount, locale)}
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate ? (
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(note)} aria-label={t.common.edit}>
                          <Pencil />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-danger"
                          onClick={() => setDeleting(note)}
                          aria-label={t.common.delete}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      {editing ? (
        <NoteDialog
          note={editing === "new" ? null : editing}
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
          const result = await deleteNote(deleting!.id);
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

function NoteDialog({
  note,
  onClose,
  onSaved,
}: {
  note: NoteRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const action = saveNote.bind(null, note?.id ?? null);
  const [state, formAction, pending] = useActionState(action, null);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(note ? t.common.save : t.notes.created);
      onSaved();
    } else {
      toast.error(state.error);
    }
  }, [state, onSaved, t, note]);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="sm">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{note ? t.common.edit : t.nav.noteCreate}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <FieldGrid columns={1}>
              <Field label={t.notes.noteName} htmlFor="name" required>
                <Input id="name" name="name" defaultValue={note?.name ?? ""} required />
              </Field>
              <Field label={t.notes.inStock} htmlFor="quantity">
                <Input id="quantity" name="quantity" type="number" min={0} defaultValue={note?.quantity ?? 0} />
              </Field>
            </FieldGrid>
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
