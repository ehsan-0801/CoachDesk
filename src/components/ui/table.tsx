import * as React from "react";

import { cn } from "@/lib/utils";

/** Wraps the table so wide content scrolls inside its own box rather than
 *  pushing the page sideways. */
export function TableWrap({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-[--radius-retro] border-2 border-line bg-surface retro-shadow",
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table className={cn("w-full border-collapse text-sm", className)} {...props} />;
}

export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-surface-2", className)} {...props} />;
}

export function TBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b-2 border-line last:border-b-0 hover:bg-surface-2/60", className)}
      {...props}
    />
  );
}

export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border-b-2 border-line px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />;
}

export function TFoot({ className, ...props }: React.ComponentProps<"tfoot">) {
  return <tfoot className={cn("border-t-2 border-line bg-surface-2 font-bold", className)} {...props} />;
}
