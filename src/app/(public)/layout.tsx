import Link from "next/link";

import { LocaleToggle } from "@/components/shell/locale-toggle";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/server/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b-2 border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center">
            <Logo height={32} alt={t.app.name} eager />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/portal">{t.nav.studentPortal}</Link>
            </Button>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href={user ? "/dashboard" : "/login"}>
                {user ? t.nav.dashboard : t.auth.signIn}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t-2 border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-muted">
          <p>
            © {new Date().getFullYear()} {t.app.name}
          </p>
          <p>{t.app.tagline}</p>
        </div>
      </footer>
    </div>
  );
}
