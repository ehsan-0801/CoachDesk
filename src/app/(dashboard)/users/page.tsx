import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { rowsToPermissionMap } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { db } from "@/server/db";

import { UsersClient } from "./users-client";

export const metadata = { title: "Users & access" };

export default async function UsersPage() {
  await requirePermission("users", "view");
  const { t } = await getI18n();

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { permissions: true },
  });

  return (
    <>
      <PageHeader title={t.users.title} description={t.users.subtitle} />
      <UsersClient
        users={users.map((user) => {
          const permissions = rowsToPermissionMap(user.permissions);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
            permissions,
            moduleCount: Object.keys(permissions).length,
          };
        })}
      />
    </>
  );
}
