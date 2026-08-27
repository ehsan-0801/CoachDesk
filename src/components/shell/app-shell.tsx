"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { LocaleToggle } from "@/components/shell/locale-toggle";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close the drawer on navigation, otherwise it covers the page just reached.
  React.useEffect(() => setMobileOpen(false), [pathname]);

  const brand = (
    <Link href="/dashboard" className="flex items-center gap-2 font-bold">
      <span className="grid size-8 shrink-0 place-items-center rounded-[--radius-retro] border-2 border-line bg-primary text-primary-ink retro-shadow-sm">
        C
      </span>
      <span className="truncate text-base tracking-tight">{t.app.name}</span>
    </Link>
  );

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r-2 border-line bg-surface lg:flex">
        <div className="flex h-14 shrink-0 items-center border-b-2 border-line px-4">{brand}</div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t.common.close}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r-2 border-line bg-surface">
            <div className="flex h-14 shrink-0 items-center justify-between border-b-2 border-line px-4">
              {brand}
              <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)} aria-label={t.common.close}>
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b-2 border-line bg-canvas/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-canvas/80 sm:px-4">
          <Button
            variant="outline"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
          <div className="lg:hidden">{brand}</div>
          <div className="ml-auto flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className={cn("mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4 sm:py-6")}>{children}</main>
      </div>
    </div>
  );
}
