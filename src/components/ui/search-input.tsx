"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Debounced, URL-backed search box. Writing the term to the query string keeps
 * the filtered view shareable and lets the page stay a server component.
 */
export function SearchInput({
  placeholder,
  paramName = "q",
  className,
  delay = 300,
}: {
  placeholder?: string;
  paramName?: string;
  className?: string;
  delay?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(searchParams.get(paramName) ?? "");

  const commit = React.useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim()) params.set(paramName, next.trim());
      else params.delete(paramName);
      // Any change to the filter invalidates the current page number.
      params.delete("page");
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams, paramName],
  );

  React.useEffect(() => {
    const current = searchParams.get(paramName) ?? "";
    if (value === current) return;
    const timer = setTimeout(() => commit(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay, commit, searchParams, paramName]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9 pr-9"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-[0.35rem] text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
