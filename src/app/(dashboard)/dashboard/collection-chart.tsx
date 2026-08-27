"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useI18n } from "@/components/providers/i18n-provider";
import { MONTH_NAMES, formatCurrency, toLocaleDigits } from "@/lib/i18n";

export function CollectionChart({ data }: { data: { month: number; year: number; total: number }[] }) {
  const { locale, t } = useI18n();

  const rows = data.map((row) => ({
    ...row,
    // Short month label: the full Bangla month names do not fit an axis tick.
    label: `${MONTH_NAMES[locale][row.month - 1].slice(0, 3)} ${toLocaleDigits(String(row.year).slice(-2), locale)}`,
  }));

  if (!rows.length) {
    return <p className="grid h-64 place-items-center text-sm text-muted">{t.common.noResults}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink)" opacity={0.12} vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: "var(--color-ink)", strokeWidth: 2 }}
          tick={{ fill: "var(--color-muted)", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fill: "var(--color-muted)", fontSize: 11 }}
          tickFormatter={(value: number) => `${toLocaleDigits(Math.round(value / 1000), locale)}k`}
        />
        <Tooltip
          cursor={{ fill: "var(--color-ink)", opacity: 0.06 }}
          contentStyle={{
            border: "2px solid var(--color-ink)",
            borderRadius: 8,
            background: "var(--color-surface)",
            boxShadow: "3px 3px 0 0 var(--color-ink)",
            color: "var(--color-ink)",
            fontWeight: 600,
          }}
          formatter={(value) => [formatCurrency(Number(value), locale), t.payments.collected]}
        />
        <Bar
          dataKey="total"
          fill="var(--color-primary)"
          stroke="var(--color-ink)"
          strokeWidth={2}
          radius={[4, 4, 0, 0]}
          maxBarSize={56}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
