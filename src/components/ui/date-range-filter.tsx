"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";

/** From/to pair backed by the query string, shared by every finance report. */
export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="date"
        value={from}
        aria-label={t.common.from}
        className="w-40"
        onChange={(event) => update("from", event.target.value)}
      />
      <span className="text-muted">–</span>
      <Input
        type="date"
        value={to}
        aria-label={t.common.to}
        className="w-40"
        onChange={(event) => update("to", event.target.value)}
      />
    </div>
  );
}
