"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/providers/i18n-provider";
import { SimpleSelect } from "@/components/ui/select";
import { MONTH_NAMES, formatNumber } from "@/lib/i18n";

export function MonthFilters({
  batches,
  batchId,
  year,
  month,
}: {
  batches: { id: number; label: string }[];
  batchId: string;
  year: number;
  month: number;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) params.set(key, value);
    router.replace(`${pathname}?${params}`);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SimpleSelect
        value={batchId}
        onValueChange={(value) => update({ batch: value })}
        placeholder={t.attendance.selectBatch}
        options={batches.map((b) => ({ value: String(b.id), label: b.label }))}
        className="w-52"
      />
      <SimpleSelect
        value={String(month)}
        onValueChange={(value) => update({ month: value })}
        options={MONTH_NAMES[locale].map((name, index) => ({ value: String(index + 1), label: name }))}
        className="w-40"
      />
      <SimpleSelect
        value={String(year)}
        onValueChange={(value) => update({ year: value })}
        options={years.map((y) => ({ value: String(y), label: formatNumber(y, locale) }))}
        className="w-28"
      />
    </div>
  );
}
