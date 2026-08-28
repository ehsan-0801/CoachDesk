import Image from "next/image";

import { cn } from "@/lib/utils";

/** `public/CoachDeskLogo.png` is 2172×724 — an exactly 3:1 wordmark lockup. */
const ASPECT = 3;

type LogoProps = {
  /** Rendered height in px; width follows from the lockup's 3:1 ratio. */
  height?: number;
  /** The lockup already spells out the product name, so callers pass the
   *  localised name here rather than repeating it in adjacent text. */
  alt?: string;
  /** Header logos sit above the fold — skip lazy-loading so they don't pop in. */
  eager?: boolean;
  className?: string;
};

export function Logo({ height = 36, alt = "CoachDesk", eager = false, className }: LogoProps) {
  return (
    <Image
      src="/CoachDeskLogo.png"
      alt={alt}
      width={height * ASPECT}
      height={height}
      loading={eager ? "eager" : "lazy"}
      className={cn("w-auto object-contain", className)}
    />
  );
}
