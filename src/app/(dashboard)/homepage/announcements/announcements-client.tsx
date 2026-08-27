"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { formatDateShort } from "@/lib/i18n";
import { deleteAnnouncement, saveAnnouncement, toggleAnnouncement } from "@/server/actions/homepage";

export interface AnnouncementRow {
  id: number;
  content: string;
  isActive: boolean;
  createdAt: string;
}

export function AnnouncementsClient({
  announcements,
  canManage,
}: {
  announcements: AnnouncementRow[];
  canManage: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const action = saveAnnouncement.bind(null, null);
  const [state, formAction, pending] = useActionState(action, null);
  const [isActive, setIsActive] = React.useState(true);
  const [deleting, setDeleting] = React.useState<AnnouncementRow | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t.homepage.saved);
      formRef.current?.reset();
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, t, router]);

  return (
    <div className="space-y-4">
      {canManage ? (
        <form ref={formRef} action={formAction}>
          <Card>
            <CardContent>
              <Field label={t.homepage.announcementText} htmlFor="content" required>
                <Textarea id="content" name="content" rows={3} required />
              </Field>
            </CardContent>
            <CardFooter className="justify-between">
              <label className="flex cursor-pointer items-center gap-2.5">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className="text-sm font-bold">{t.homepage.showOnSite}</span>
              </label>
              <input type="hidden" name="isActive" value={isActive ? "on" : "off"} />
              <Button type="submit" loading={pending}>
                <Plus /> {t.common.add}
              </Button>
            </CardFooter>
          </Card>
        </form>
      ) : null}

      {announcements.length === 0 ? (
        <EmptyState title={t.common.noResults} />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{announcement.content}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateShort(announcement.createdAt, locale)}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <Switch
                        checked={announcement.isActive}
                        onCheckedChange={async (next) => {
                          const result = await toggleAnnouncement(announcement.id, next);
                          if (result.ok) router.refresh();
                          else toast.error(result.error);
                        }}
                      />
                      <span className="text-xs font-bold uppercase text-muted">{t.homepage.showOnSite}</span>
                    </label>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-danger"
                      onClick={() => setDeleting(announcement)}
                      aria-label={t.common.delete}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Confirm
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t.common.delete}
        description={deleting?.content.slice(0, 80)}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          const result = await deleteAnnouncement(deleting!.id);
          if (result.ok) {
            toast.success(t.common.delete);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </div>
  );
}
