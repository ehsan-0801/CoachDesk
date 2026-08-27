import { MessageSquareOff } from "lucide-react";

import { getI18n } from "@/lib/i18n/server";
import { isSmsEnabled } from "@/server/sms";

/**
 * Shown on every SMS screen while delivery is off, so nobody mistakes a queued
 * message for one that actually reached a phone.
 */
export async function SmsDisabledBanner() {
  if (isSmsEnabled()) return null;
  const { t } = await getI18n();

  return (
    <div className="mb-4 flex items-start gap-3 rounded-[--radius-retro] border-2 border-line bg-warning px-4 py-3 text-warning-ink retro-shadow">
      <MessageSquareOff className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="text-sm font-bold">{t.sms.disabledBanner}</p>
    </div>
  );
}
