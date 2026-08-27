import { redirect } from "next/navigation";

/** Note creation happens in a dialog on the inventory screen; this route exists
 *  only so the sidebar link has somewhere to land. */
export default function CreateNoteRedirect() {
  redirect("/notes");
}
