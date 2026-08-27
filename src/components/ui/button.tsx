"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "retro-press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[--radius-retro] border-2 border-line font-bold tracking-tight disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-ink retro-shadow hover:brightness-105",
        secondary: "bg-secondary text-secondary-ink retro-shadow hover:brightness-105",
        accent: "bg-accent text-accent-ink retro-shadow hover:brightness-105",
        danger: "bg-danger text-danger-ink retro-shadow hover:brightness-105",
        success: "bg-success text-success-ink retro-shadow hover:brightness-105",
        outline: "bg-surface text-ink retro-shadow hover:bg-surface-2",
        ghost: "border-transparent bg-transparent text-ink shadow-none hover:bg-surface-2 hover:border-line",
        link: "border-transparent bg-transparent text-ink shadow-none underline underline-offset-4 hover:opacity-70",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { buttonVariants };
