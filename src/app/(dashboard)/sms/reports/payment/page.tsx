import { getI18n } from "@/lib/i18n/server";
import type { SmsCategory } from "@/lib/types";
import { requirePermission } from "@/server/auth";

import { SmsReport } from "../../report/sms-report";

export const metadata = { title: "Payment SMS report" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The two categories the desk means when it says "payment SMS". */
export const PAYMENT_SMS_CATEGORIES: readonly SmsCategory[] = ["payment_confirmation", "due_payment"];

export default async function PaymentSmsReportPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("sms", "view");
  const { t } = await getI18n();

  return (
    <SmsReport
      title={t.sms.paymentReport}
      params={await searchParams}
      lockedCategories={PAYMENT_SMS_CATEGORIES}
    />
  );
}
