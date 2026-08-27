import "server-only";

import type { Prisma, SmsCategory } from "@/lib/types";
import { db } from "@/server/db";

import { isSmsEnabled } from "./provider";
import { renderTemplate } from "./templates";

/** One student's worth of substitution values for a single category. */
export interface SmsRecipientContext {
  studentId?: number | null;
  batchId?: number | null;
  studentPhone?: string | null;
  parentPhone?: string | null;
  context: Record<string, string | number | null | undefined>;
}

export interface EnqueueOptions {
  category: SmsCategory;
  recipients: SmsRecipientContext[];
  requestedBy?: number | null;
}

export interface EnqueueResult {
  /** Rows written to `sms_messages`, whatever their status. */
  composed: number;
  /** Rows that a dispatcher would pick up. Always 0 while SMS is off. */
  queued: number;
  /** Rows short-circuited to `skipped`. */
  skipped: number;
  reason?: string;
}

const PHONE_BLOCKLIST = new Set(["01111111111", "01234567890", "00000000000", "01000000000"]);

/** Bangladeshi mobile numbers, normalised to the 11-digit `01XXXXXXXXX` form. */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) digits = `0${digits.slice(3)}`;
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  if (digits.length !== 11 || !digits.startsWith("01")) return null;
  if (PHONE_BLOCKLIST.has(digits)) return null;
  return digits;
}

/**
 * Composes every message a trigger implies and records it.
 *
 * This is the single entry point for the whole app — attendance, results,
 * payments and broadcasts all call it. It always writes rows, so the SMS log
 * is a faithful record of what the system decided to send, and it never
 * dispatches: while `SMS_ENABLED` is false every row lands as `skipped` with
 * reason `sms_disabled`.
 */
export async function enqueueSms({ category, recipients, requestedBy }: EnqueueOptions): Promise<EnqueueResult> {
  if (!recipients.length) return { composed: 0, queued: 0, skipped: 0 };

  const template = await db.smsTemplate.findUnique({ where: { category } });

  if (!template) {
    return { composed: 0, queued: 0, skipped: 0, reason: "template_missing" };
  }
  if (!template.isActive) {
    return { composed: 0, queued: 0, skipped: 0, reason: "template_inactive" };
  }

  const enabled = isSmsEnabled();
  const status = enabled ? ("queued" as const) : ("skipped" as const);
  const reason = enabled ? null : "sms_disabled";

  const rows: Prisma.SmsMessageCreateManyInput[] = [];

  for (const recipient of recipients) {
    const shared = {
      category,
      studentId: recipient.studentId ?? null,
      batchId: recipient.batchId ?? null,
      status,
      reason,
      context: recipient.context,
      requestedById: requestedBy ?? null,
    };

    if (template.sendToStudent) {
      const phone = normalisePhone(recipient.studentPhone);
      if (phone) {
        rows.push({
          ...shared,
          recipientType: "student",
          phone,
          body: renderTemplate(template.studentTemplate, recipient.context),
        });
      }
    }

    if (template.sendToParent && template.parentTemplate) {
      const phone = normalisePhone(recipient.parentPhone);
      if (phone) {
        rows.push({
          ...shared,
          recipientType: "parent",
          phone,
          body: renderTemplate(template.parentTemplate, recipient.context),
        });
      }
    }

    if (template.sendToTest) {
      const phone = normalisePhone(template.testPhone);
      if (phone) {
        rows.push({
          ...shared,
          recipientType: "test",
          phone,
          body: renderTemplate(template.studentTemplate, recipient.context),
        });
      }
    }
  }

  if (!rows.length) return { composed: 0, queued: 0, skipped: 0, reason: "no_valid_recipients" };

  await db.smsMessage.createMany({ data: rows });

  return {
    composed: rows.length,
    queued: enabled ? rows.length : 0,
    skipped: enabled ? 0 : rows.length,
    reason: reason ?? undefined,
  };
}

/**
 * Drains queued messages through the configured provider.
 *
 * Left unwired on purpose: with `SMS_ENABLED=false` nothing ever reaches the
 * `queued` state, so this returns immediately. It exists so the pipeline has a
 * complete shape — a cron route or worker can call it the day delivery is on.
 */
export async function dispatchQueued(limit = 100): Promise<{ dispatched: number; skipped: boolean }> {
  if (!isSmsEnabled()) return { dispatched: 0, skipped: true };

  const pending = await db.smsMessage.findMany({
    where: { status: "queued" },
    take: limit,
    orderBy: { id: "asc" },
  });
  if (!pending.length) return { dispatched: 0, skipped: false };

  const { getProvider } = await import("./provider");
  const results = await getProvider().send(
    pending.map((message) => ({ messageId: message.id, phone: message.phone, body: message.body })),
  );

  const sentIds = results.filter((r) => r.ok).map((r) => r.messageId);
  const failed = results.filter((r) => !r.ok);

  if (sentIds.length) {
    await db.smsMessage.updateMany({
      where: { id: { in: sentIds } },
      data: { status: "sent", sentAt: new Date() },
    });
  }
  for (const failure of failed) {
    await db.smsMessage.updateMany({
      where: { id: failure.messageId, status: "queued" },
      data: { status: "failed", reason: failure.error ?? "unknown_error" },
    });
  }

  return { dispatched: sentIds.length, skipped: false };
}
