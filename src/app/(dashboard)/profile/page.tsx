import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";

import { ProfileForm } from "./profile-form";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const session = await requireUser();
  const { t } = await getI18n();

  const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });
  const roleLabel = { admin: t.users.admin, manager: t.users.manager, staff: t.users.staff }[user.role];

  return (
    <>
      <PageHeader title={t.nav.profile} description={user.email} />
      <ProfileForm
        defaults={{
          name: user.name,
          email: user.email,
          phone: user.phone ?? "",
          role: roleLabel,
        }}
      />
    </>
  );
}
