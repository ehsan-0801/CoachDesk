import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { listNotes } from "@/server/queries/notes";

import { NotesClient } from "./notes-client";

export const metadata = { title: "Notes" };

export default async function NotesPage() {
  const user = await requirePermission("notes", "view");
  const { t } = await getI18n();
  const notes = await listNotes();

  return (
    <>
      <PageHeader title={t.notes.inventory} description={t.notes.title} />
      <NotesClient
        notes={notes}
        canCreate={user.role === "admin" && can(user, "notes", "create")}
        canUpdate={can(user, "notes", "update")}
        canDelete={can(user, "notes", "delete")}
      />
    </>
  );
}
