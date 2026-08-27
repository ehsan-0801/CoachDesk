import { PageHeader } from "@/components/shell/page-header";
import { SmsDisabledBanner } from "@/components/shell/sms-disabled-banner";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/server/auth";
import { listSmsTemplates } from "@/server/queries/sms";

import { TemplateCard } from "./template-card";

export const metadata = { title: "SMS templates" };

export default async function SmsTemplatesPage() {
  const user = await requirePermission("sms", "view");
  const { t } = await getI18n();
  const templates = await listSmsTemplates();

  return (
    <>
      <PageHeader title={t.sms.templates} description={t.sms.title} />
      <SmsDisabledBanner />

      <div className="grid gap-4 xl:grid-cols-2">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            category={template.category}
            isActive={template.isActive}
            studentTemplate={template.studentTemplate}
            parentTemplate={template.parentTemplate}
            sendToStudent={template.sendToStudent}
            sendToParent={template.sendToParent}
            sendToTest={template.sendToTest}
            testPhone={template.testPhone}
            placeholders={template.placeholders}
            canUpdate={can(user, "sms", "update")}
          />
        ))}
      </div>
    </>
  );
}
