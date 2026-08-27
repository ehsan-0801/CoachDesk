"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/i18n";

/** URL-driven pagination: the page number lives in the query string, so a
 *  paginated view is linkable and survives a refresh. */
export function Pagination({
  page,
  pageCount,
  total,
  paramName = "page",
}: {
  page: number;
  pageCount: number;
  total: number;
  paramName?: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goTo = React.useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next <= 1) params.delete(paramName);
      else params.set(paramName, String(next));
      router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams, paramName],
  );

  if (pageCount <= 1) {
    return (
      <p className="px-1 py-2 text-xs text-muted">
        {t.common.showing} {formatNumber(total, locale)} {t.common.results}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <p className="text-xs text-muted">
        {t.common.page} {formatNumber(page, locale)} {t.common.of} {formatNumber(pageCount, locale)} ·{" "}
        {formatNumber(total, locale)} {t.common.results}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goTo(page - 1)}>
          <ChevronLeft /> {t.common.previous}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => goTo(page + 1)}>
          {t.common.next} <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
