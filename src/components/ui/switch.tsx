"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-line transition-colors data-[state=checked]:bg-success data-[state=unchecked]:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full border-2 border-line bg-surface transition-transform data-[state=checked]:translate-x-[1.3rem] data-[state=unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  );
}
