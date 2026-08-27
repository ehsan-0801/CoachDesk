"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

import { cn } from "@/lib/utils";

export function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      className={cn("flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted", className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="text-danger" aria-hidden>
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}
