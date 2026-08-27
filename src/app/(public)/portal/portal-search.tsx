"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PortalSearch({ initial }: { initial: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = React.useState(initial);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        router.push(value.trim() ? `/portal?q=${encodeURIComponent(value.trim())}` : "/portal");
      }}
      className="flex flex-wrap gap-2"
    >
      <div className="relative min-w-64 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t.portal.searchPlaceholder}
          aria-label={t.portal.searchPlaceholder}
          className="h-12 pl-9 text-base"
          inputMode="numeric"
        />
      </div>
      <Button type="submit" size="lg">
        {t.common.search}
      </Button>
    </form>
  );
}
