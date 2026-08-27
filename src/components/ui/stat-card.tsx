import * as React from "react";

import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary text-primary-ink",
  secondary: "bg-secondary text-secondary-ink",
  accent: "bg-accent text-accent-ink",
  success: "bg-success text-success-ink",
  warning: "bg-warning text-warning-ink",
  danger: "bg-danger text-danger-ink",
  info: "bg-info text-info-ink",
  neutral: "bg-surface-2 text-ink",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[--radius-retro] border-2 border-line bg-surface p-4 retro-shadow",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-[--radius-retro] border-2 border-line [&_svg]:size-5",
            TONES[tone],
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-bold leading-tight tabular-nums">{value}</p>
        {hint ? <p className="mt-0.5 truncate text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
