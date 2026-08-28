"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchResult = {
  id: number;
  name: string;
  studentUid: string | null;
  phone: string | null;
  batchName: string | null;
};

export function PortalSearch({ initial }: { initial: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = React.useState<string>(initial);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [showDropdown, setShowDropdown] = React.useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);
  const debounceRef = React.useRef<NodeJS.Timeout | undefined>(undefined);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search on every key press with debouncing
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setShowDropdown(false);

    debounceRef.current = setTimeout(async () => {
      try {
        console.log("Searching for:", trimmed);
        const response = await fetch(`/api/portal/search?q=${encodeURIComponent(trimmed)}`);
        const data = await response.json();
        console.log("Search results:", data);
        
        if (response.ok && data.results) {
          setResults(data.results);
          setShowDropdown(data.results.length > 0);
        } else {
          setResults([]);
          setShowDropdown(false);
        }
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleSelectStudent = (query: string) => {
    setValue(query);
    setShowDropdown(false);
    setSelectedIndex(-1);
    router.push(`/portal?q=${encodeURIComponent(query)}`);
  };

  const handleClear = () => {
    setValue("");
    setResults([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    // Navigate to portal without any query to clear all data
    router.push("/portal");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault();
      const selected = results[selectedIndex];
      handleSelectStudent(selected.studentUid || selected.phone || selected.name);
    } else if (event.key === "Escape") {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setShowDropdown(false);
          router.push(value.trim() ? `/portal?q=${encodeURIComponent(value.trim())}` : "/portal");
        }}
        className="flex flex-wrap gap-2"
      >
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0 && value.trim().length >= 1) {
                setShowDropdown(true);
              }
            }}
            placeholder={t.portal.searchPlaceholder}
            aria-label={t.portal.searchPlaceholder}
            className="h-12 pl-9 pr-20 text-base"
            inputMode="search"
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted hover:text-foreground"
                aria-label="Clear"
              >
                <X className="size-4" />
              </button>
            )}
            {loading && (
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>

          {/* Dropdown - positioned absolutely relative to input */}
          {showDropdown && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-[--radius-retro] border-2 border-line bg-surface retro-shadow">
              {results.map((student, index) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleSelectStudent(student.studentUid || student.phone || student.name)}
                  className={`block w-full border-b-2 border-line px-4 py-3 text-left transition-colors last:border-0 ${
                    index === selectedIndex ? "bg-primary/20" : "hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-ink">
                      {student.studentUid || "—"}
                    </span>
                    <span className="text-muted">—</span>
                    <span className="font-medium text-ink">{student.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" size="lg">
          {t.common.search}
        </Button>
      </form>
    </div>
  );
}
