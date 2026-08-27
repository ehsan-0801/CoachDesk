import Link from "next/link";
import { ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function Forbidden() {
  const { t } = await getI18n();

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-[--radius-retro] border-2 border-line bg-surface p-8 text-center retro-shadow-lg">
        <div className="mx-auto grid size-14 place-items-center rounded-full border-2 border-line bg-danger text-danger-ink">
          <ShieldOff className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold">{t.errors.forbidden}</h1>
        <p className="mt-1.5 text-sm text-muted">{t.errors.forbiddenBody}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">{t.errors.goHome}</Link>
        </Button>
      </div>
    </div>
  );
}
