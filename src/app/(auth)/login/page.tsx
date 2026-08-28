import { redirect } from "next/navigation";

import { LocaleToggle } from "@/components/shell/locale-toggle";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/server/auth";

import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const { t } = await getI18n();

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LocaleToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1>
            <Logo height={56} alt={t.app.name} eager className="mx-auto" />
            <span className="sr-only">{t.app.name}</span>
          </h1>
          <p className="mt-3 text-sm text-muted">{t.auth.signInSubtitle}</p>
        </div>

        <div className="rounded-[--radius-retro] border-2 border-line bg-surface p-6 retro-shadow-lg">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          {t.app.tagline}
        </p>
      </div>
    </div>
  );
}
