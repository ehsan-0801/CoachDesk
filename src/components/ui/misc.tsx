import * as React from "react";

import { cn } from "@/lib/utils";

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "bg-line",
        orientation === "horizontal" ? "h-0.5 w-full" : "h-full w-0.5",
        className,
      )}
      {...props}
    />
  );
}

/** Loading placeholder. Striped rather than shimmering, to match the system. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("retro-stripes animate-pulse rounded-[--radius-retro] border-2 border-line bg-surface-2", className)}
      {...props}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[--radius-retro] border-2 border-dashed border-line bg-surface-2/50 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="grid size-12 place-items-center rounded-full border-2 border-line bg-surface [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="font-bold">{title}</p>
        {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
