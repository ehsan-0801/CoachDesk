"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { SimpleSelect } from "@/components/ui/select";

/** A select that writes its value to the query string, so server components can
 *  read the filter without any client-side data fetching. */
export function FilterSelect({
  paramName,
  options,
  placeholder,
  defaultValue = "",
  className,
}: {
  paramName: string;
  options: { value: string; label: React.ReactNode }[];
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramName) ?? defaultValue;

  const onChange = React.useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next && next !== defaultValue) params.set(paramName, next);
      else params.delete(paramName);
      params.delete("page");
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams, paramName, defaultValue],
  );

  return (
    <SimpleSelect
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={placeholder}
      className={className}
    />
  );
}
