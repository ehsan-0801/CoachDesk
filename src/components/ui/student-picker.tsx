"use client";

import { Check, Search, X } from "lucide-react";
import * as React from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PickedStudent {
  id: number;
  name: string;
  studentUid: string | null;
  phone: string | null;
  archived: boolean;
  isModelTest: boolean;
  batchLabel: string | null;
}

/**
 * Typeahead over the student list. Queries the server rather than shipping the
 * whole roster to the browser, which matters once a centre has a few thousand
 * students on file.
 */
export function StudentPicker({
  value,
  onChange,
  includeArchived = false,
  name,
  placeholder,
}: {
  value: PickedStudent | null;
  onChange: (student: PickedStudent | null) => void;
  includeArchived?: boolean;
  name?: string;
  placeholder?: string;
}) {
  const { t } = useI18n();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<PickedStudent[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/students/search?q=${encodeURIComponent(query)}&archived=${includeArchived}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        setResults(data.students ?? []);
        setOpen(true);
      } catch {
        // An aborted request is the normal case while the user keeps typing.
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, includeArchived]);

  // Clicking anywhere else dismisses the result list.
  React.useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-[--radius-retro] border-2 border-line bg-surface-2 px-3 py-2 retro-shadow-sm">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{value.name}</p>
          <p className="truncate text-xs text-muted">
            {value.studentUid ?? "—"}
            {value.batchLabel ? ` · ${value.batchLabel}` : ""}
            {value.phone ? ` · ${value.phone}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {value.isModelTest ? <Badge variant="info">MT</Badge> : null}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            aria-label={t.common.clear}
            className="grid size-7 place-items-center rounded-[0.35rem] border-2 border-line bg-surface"
          >
            <X className="size-3.5" />
          </button>
        </div>
        {name ? <input type="hidden" name={name} value={value.id} /> : null}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder ?? t.students.searchPlaceholder}
        className="pl-9"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
      />

      {open && (results.length > 0 || loading) ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-[--radius-retro] border-2 border-line bg-surface p-1 retro-shadow"
        >
          {loading && results.length === 0 ? (
            <li className="px-2 py-2 text-sm text-muted">{t.common.loading}</li>
          ) : null}
          {results.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(student);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[0.35rem] px-2 py-1.5 text-left hover:bg-primary hover:text-primary-ink",
                )}
              >
                <Check className="size-3.5 shrink-0 opacity-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{student.name}</span>
                  <span className="block truncate text-xs opacity-70">
                    {student.studentUid ?? "—"}
                    {student.batchLabel ? ` · ${student.batchLabel}` : ""}
                  </span>
                </span>
                {student.archived ? <Badge variant="neutral">{t.common.archived}</Badge> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
