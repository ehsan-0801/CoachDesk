"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";

/**
 * Downloads the current table as CSV.
 *
 * The link carries the page's live search params through to the export route so
 * the file matches the filters on screen. `page` is dropped deliberately — an
 * export covers the whole filtered set, not the page being viewed.
 */
export function ExportButton({
  dataset,
  extraParams,
  className,
}: {
  /** Key in the export route's dataset table, e.g. `students`. */
  dataset: string;
  /** Fixed params the page implies but doesn't put in the URL, e.g. a scope. */
  extraParams?: Record<string, string>;
  className?: string;
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams);
  params.delete("page");
  for (const [key, value] of Object.entries(extraParams ?? {})) params.set(key, value);

  const query = params.toString();

  return (
    <Button asChild variant="outline" className={className}>
      {/* A plain link, so the browser handles the download and no JS is needed. */}
      <a href={`/api/export/${dataset}${query ? `?${query}` : ""}`} download>
        <Download /> {t.common.export}
      </a>
    </Button>
  );
}
