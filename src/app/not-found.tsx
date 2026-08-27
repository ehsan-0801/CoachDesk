import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-[--radius-retro] border-2 border-line bg-surface p-8 text-center retro-shadow-lg">
        <p className="text-6xl font-bold tracking-tighter">404</p>
        <h1 className="mt-3 text-xl font-bold">{t.errors.notFound}</h1>
        <p className="mt-1.5 text-sm text-muted">{t.errors.notFoundBody}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">{t.errors.goHome}</Link>
        </Button>
      </div>
    </div>
  );
}
