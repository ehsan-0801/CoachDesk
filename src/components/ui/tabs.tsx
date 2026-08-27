"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex w-full items-center gap-1 overflow-x-auto rounded-[--radius-retro] border-2 border-line bg-surface-2 p-1 retro-shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.35rem] border-2 border-transparent px-3 py-1.5 text-sm font-bold text-muted transition-colors data-[state=active]:border-line data-[state=active]:bg-primary data-[state=active]:text-primary-ink data-[state=active]:retro-shadow-sm disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 outline-none", className)} {...props} />;
}
