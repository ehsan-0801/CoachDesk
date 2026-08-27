"use client";

import { AlertTriangle } from "lucide-react";
import * as React from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="w-full max-w-md rounded-[--radius-retro] border-2 border-line bg-surface p-8 text-center retro-shadow-lg">
        <div className="mx-auto grid size-14 place-items-center rounded-full border-2 border-line bg-warning text-warning-ink">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold">{t.errors.serverError}</h1>
        <p className="mt-1.5 text-sm text-muted">{t.errors.serverErrorBody}</p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted">#{error.digest}</p>
        ) : null}
        <Button className="mt-6" onClick={reset}>
          {t.errors.tryAgain}
        </Button>
      </div>
    </div>
  );
}
