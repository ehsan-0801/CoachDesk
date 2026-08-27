import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border-2 border-line px-2.5 py-0.5 text-xs font-bold leading-tight whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-ink",
        primary: "bg-primary text-primary-ink",
        secondary: "bg-secondary text-secondary-ink",
        accent: "bg-accent text-accent-ink",
        success: "bg-success text-success-ink",
        warning: "bg-warning text-warning-ink",
        danger: "bg-danger text-danger-ink",
        info: "bg-info text-info-ink",
        outline: "bg-transparent text-ink",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
