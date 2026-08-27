"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/misc";
import { TBody, TD, TFoot, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/i18n";
import { queueDueReminders } from "@/server/actions/payments";

export interface DuesTableRow {
  id: number;
  name: string;
  studentUid: string | null;
  phone: string | null;
  parentPhone: string | null;
  batchLabel: string | null;
  monthlyFee: number;
  expected: number;
  paid: number;
  due: number;
  monthCount: number;
}

export function DuesTable({
  rows,
  totalDue,
  canQueueSms,
}: {
  rows: DuesTableRow[];
  totalDue: number;
  canQueueSms: boolean;
}) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [pending, startTransition] = React.useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function sendReminders() {
    startTransition(async () => {
      const result = await queueDueReminders([...selected]);
      if (result.ok) {
        const composed = result.data?.composed ?? 0;
        // While delivery is off, every message lands as "skipped" — say so
        // plainly rather than implying anything was sent.
        toast.success(
          composed > 0
            ? `${t.sms.queued}: ${formatNumber(composed, locale)} — ${t.sms.skippedDisabled}`
            : (result.message ?? t.sms.skippedDisabled),
        );
        setSelected(new Set());
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!rows.length) {
    return <EmptyState title={t.common.noResults} description={t.payments.empty} />;
  }

  return (
    <div className="space-y-3">
      {canQueueSms ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">
            {formatNumber(selected.size, locale)} {t.common.selected}
          </Badge>
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            disabled={selected.size === 0}
            loading={pending}
            onClick={sendReminders}
          >
            <MessageSquare /> {t.sms.queued}
          </Button>
        </div>
      ) : null}

      <TableWrap>
        <Table>
          <THead>
            <TR>
              {canQueueSms ? (
                <TH className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(value) =>
                      setSelected(value ? new Set(rows.map((r) => r.id)) : new Set())
                    }
                    aria-label={t.common.select}
                  />
                </TH>
              ) : null}
              <TH className="w-20">{t.students.studentId}</TH>
              <TH>{t.students.studentName}</TH>
              <TH>{t.common.phone}</TH>
              <TH className="text-right">{t.payments.months}</TH>
              <TH className="text-right">{t.payments.expected}</TH>
              <TH className="text-right">{t.payments.collected}</TH>
              <TH className="text-right">{t.payments.due}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                {canQueueSms ? (
                  <TD>
                    <Checkbox
                      checked={selected.has(row.id)}
                      onCheckedChange={(value) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (value) next.add(row.id);
                          else next.delete(row.id);
                          return next;
                        })
                      }
                      aria-label={row.name}
                    />
                  </TD>
                ) : null}
                <TD className="font-bold tabular-nums">{row.studentUid ?? "—"}</TD>
                <TD>
                  <Link href={`/payments/ledger?student=${row.id}`} className="font-medium underline-offset-2 hover:underline">
                    {row.name}
                  </Link>
                  <span className="block text-xs text-muted">{row.batchLabel ?? "—"}</span>
                </TD>
                <TD className="whitespace-nowrap">
                  <span className="block text-sm tabular-nums">{row.phone ?? "—"}</span>
                  <span className="block text-xs tabular-nums text-muted">{row.parentPhone ?? "—"}</span>
                </TD>
                <TD className="text-right tabular-nums">{formatNumber(row.monthCount, locale)}</TD>
                <TD className="text-right tabular-nums text-muted">{formatCurrency(row.expected, locale)}</TD>
                <TD className="text-right tabular-nums text-success">{formatCurrency(row.paid, locale)}</TD>
                <TD className="text-right">
                  <Badge variant="danger">{formatCurrency(row.due, locale)}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
          <TFoot>
            <TR>
              <TD colSpan={canQueueSms ? 7 : 6} className="text-right">
                {t.payments.outstanding}
              </TD>
              <TD className="text-right tabular-nums">{formatCurrency(totalDue, locale)}</TD>
            </TR>
          </TFoot>
        </Table>
      </TableWrap>
    </div>
  );
}
