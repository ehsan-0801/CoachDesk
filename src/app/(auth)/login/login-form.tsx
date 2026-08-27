"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "@/server/actions/auth";

export function LoginForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);
  const [showPassword, setShowPassword] = React.useState(false);

  const message =
    state?.error === "disabled"
      ? t.auth.accountDisabled
      : state?.error
        ? t.auth.invalidCredentials
        : null;

  return (
    <form action={formAction} className="space-y-4">
      {message ? (
        <p
          role="alert"
          className="rounded-[--radius-retro] border-2 border-line bg-danger px-3 py-2 text-sm font-bold text-danger-ink"
        >
          {message}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email" required>
          {t.auth.email}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          defaultValue=""
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" required>
          {t.auth.password}
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1 top-1 grid size-8 place-items-center rounded-[0.35rem] text-muted hover:bg-surface-2 hover:text-ink"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" loading={pending}>
        {pending ? t.auth.signingIn : <><LogIn /> {t.auth.signIn}</>}
      </Button>
    </form>
  );
}
