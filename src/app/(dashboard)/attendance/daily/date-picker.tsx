"use client";

import { usePathname, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";

/** Writes the chosen day to the URL, keeping the page a server component. */
export function DatePicker({ date, paramName = "date" }: { date: string; paramName?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Input
      type="date"
      value={date}
      className="w-44"
      aria-label="Date"
      onChange={(event) => router.replace(`${pathname}?${paramName}=${event.target.value}`)}
    />
  );
}
