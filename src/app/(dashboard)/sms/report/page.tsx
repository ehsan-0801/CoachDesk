import { getI18n } from "@/lib/i18n/server";
import { requirePermission } from "@/server/auth";

import { SmsReport } from "./sms-report";

export const metadata = { title: "SMS report" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SmsReportPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("sms", "view");
  const { t } = await getI18n();

  return <SmsReport title={t.sms.report} params={await searchParams} />;
}
