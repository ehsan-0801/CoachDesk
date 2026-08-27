import * as React from "react";

import { cn } from "@/lib/utils";

export const inputClasses =
  "h-10 w-full rounded-[--radius-retro] border-2 border-line bg-surface px-3 text-sm text-ink retro-shadow-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} className={cn(inputClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(inputClasses, "min-h-24 resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}
