import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { db } from "@/server/db";

import { AnnouncementsClient } from "./announcements-client";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const user = await requirePermission("homepage", "view");
  const { t } = await getI18n();

  const announcements = await db.announcement.findMany({ orderBy: { id: "desc" } });

  return (
    <>
      <PageHeader title={t.homepage.announcements} description={t.homepage.title} />
      <AnnouncementsClient
        canManage={can(user, "homepage", "update")}
        announcements={announcements.map((announcement) => ({
          id: announcement.id,
          content: announcement.content,
          isActive: announcement.isActive,
          createdAt: announcement.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
