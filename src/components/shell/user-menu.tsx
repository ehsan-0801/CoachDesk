"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { useSession } from "@/components/providers/session-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

export function UserMenu() {
  const user = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  if (!user) return null;

  const roleLabel = { admin: t.users.admin, manager: t.users.manager, staff: t.users.staff }[user.role];

  function signOut() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success(t.auth.signedOut);
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="retro-press flex items-center gap-2 rounded-[--radius-retro] border-2 border-line bg-surface px-2 py-1 retro-shadow-sm"
        aria-label="Account menu"
      >
        <span className="grid size-7 place-items-center rounded-full border-2 border-line bg-accent text-xs font-bold text-accent-ink">
          {initials(user.name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-32 truncate text-xs font-bold leading-tight">{user.name}</span>
          <span className="block text-[10px] uppercase leading-tight text-muted">{roleLabel}</span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="normal-case">
          <span className="block truncate text-sm font-bold text-ink">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/profile")}>
          <UserIcon /> {t.nav.profile}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive disabled={pending} onSelect={(event) => { event.preventDefault(); signOut(); }}>
          <LogOut /> {t.nav.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
