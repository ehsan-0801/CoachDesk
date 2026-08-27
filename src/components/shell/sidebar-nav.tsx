"use client";

import * as Icons from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { useSession } from "@/components/providers/session-provider";
import { NAVIGATION, type NavGroup } from "@/lib/navigation";
import { can } from "@/lib/rbac";
import { cn } from "@/lib/utils";

function Icon({ name, className }: { name: string; className?: string }) {
  const Component = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Component className={className} aria-hidden />;
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useSession();
  const { t } = useI18n();

  // A group is only rendered if the user can view its module; a child is only
  // rendered if the user also holds the extra grant that child declares.
  const groups = React.useMemo(() => {
    return NAVIGATION.filter((group) => can(user, group.module, "view"))
      .map((group) => ({
        ...group,
        children: group.children?.filter((child) => {
          if (child.adminOnly && user?.role !== "admin") return false;
          return can(user, group.module, child.action ?? "view");
        }),
      }))
      .filter((group) => !group.children || group.children.length > 0);
  }, [user]);

  const isChildActive = React.useCallback(
    (href: string) => pathname === href,
    [pathname],
  );

  const isGroupActive = React.useCallback(
    (group: NavGroup) => {
      if (group.exact) return pathname === group.href;
      return pathname === group.href || pathname.startsWith(`${group.href}/`);
    },
    [pathname],
  );

  // Open the group covering the current route, and let the user toggle from there.
  const [open, setOpen] = React.useState<string | null>(
    () => groups.find((group) => isGroupActive(group))?.href ?? null,
  );

  React.useEffect(() => {
    const active = groups.find((group) => isGroupActive(group));
    if (active) setOpen(active.href);
  }, [pathname, groups, isGroupActive]);

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Main">
      {groups.map((group) => {
        const active = isGroupActive(group);
        const expanded = open === group.href;

        if (!group.children?.length) {
          return (
            <Link
              key={group.href}
              href={group.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "retro-press flex items-center gap-2.5 rounded-[--radius-retro] border-2 px-3 py-2 text-sm font-bold",
                active
                  ? "border-line bg-primary text-primary-ink retro-shadow-sm"
                  : "border-transparent text-ink hover:border-line hover:bg-surface-2",
              )}
            >
              <Icon name={group.icon} className="size-4 shrink-0" />
              <span className="truncate">{group.label(t)}</span>
            </Link>
          );
        }

        return (
          <div key={group.href}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : group.href)}
              aria-expanded={expanded}
              className={cn(
                "retro-press flex w-full items-center gap-2.5 rounded-[--radius-retro] border-2 px-3 py-2 text-sm font-bold",
                active
                  ? "border-line bg-primary text-primary-ink retro-shadow-sm"
                  : "border-transparent text-ink hover:border-line hover:bg-surface-2",
              )}
            >
              <Icon name={group.icon} className="size-4 shrink-0" />
              <span className="flex-1 truncate text-left">{group.label(t)}</span>
              <Icons.ChevronRight
                className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-90")}
                aria-hidden
              />
            </button>

            {expanded ? (
              <ul className="ml-4 mt-1 space-y-0.5 border-l-2 border-line pl-2">
                {group.children.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      onClick={onNavigate}
                      aria-current={isChildActive(child.href) ? "page" : undefined}
                      className={cn(
                        "block rounded-[0.35rem] px-2.5 py-1.5 text-sm transition-colors",
                        isChildActive(child.href)
                          ? "bg-secondary font-bold text-secondary-ink"
                          : "text-muted hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {child.label(t)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
