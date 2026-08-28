import { ArrowRight, CalendarCheck, GraduationCap, Layers, Megaphone, Wallet } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hscYearColor } from "@/lib/batch-display";
import { formatNumber, formatTimeRange, formatWeekdayKeys } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getPublicHomeData } from "@/server/queries/public";

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const data = await getPublicHomeData();

  return (
    <>
      <section className="border-b-2 border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <Badge variant="accent" className="mb-4">
              {t.app.tagline}
            </Badge>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
              {t.app.name}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">{t.dashboard.subtitle}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/portal">
                  {t.nav.studentPortal} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">{t.auth.signIn}</Link>
              </Button>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {(
              [
                [GraduationCap, data.stats.students, t.dashboard.totalStudents, "bg-secondary text-secondary-ink"],
                [Layers, data.stats.batches, t.dashboard.activeBatches, "bg-primary text-primary-ink"],
                [CalendarCheck, data.stats.exams, t.exams.title, "bg-accent text-accent-ink"],
              ] as const
            ).map(([Icon, value, label, tone], index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-3">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-[--radius-retro] border-2 border-line ${tone}`}>
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{formatNumber(value, locale)}</p>
                    <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {data.announcements.length > 0 ? (
        <section className="border-b-2 border-line bg-primary">
          <div className="mx-auto w-full max-w-6xl px-4 py-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary-ink">
              <Megaphone className="size-5" /> {t.homepage.announcements}
            </h2>
            <ul className="space-y-2">
              {data.announcements.map((announcement) => (
                <li
                  key={announcement.id}
                  className="rounded-[--radius-retro] border-2 border-line bg-surface px-4 py-3 text-sm retro-shadow-sm"
                >
                  {announcement.content}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {data.batches.length > 0 ? (
        <section>
          <div className="mx-auto w-full max-w-6xl px-4 py-12">
            <h2 className="mb-6 text-2xl font-bold tracking-tight">{t.batches.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.batches.map((batch) => (
                <Card key={batch.id} className="retro-lift">
                  <CardContent className="space-y-2 text-center">
                    <p
                      className="text-3xl font-bold tracking-tight"
                      style={{ color: hscYearColor(batch) }}
                    >
                      HSC {formatNumber(batch.hscYear, locale)}
                    </p>
                    <p className="font-bold" style={{ color: batch.infoLine1Color ?? undefined }}>
                      {batch.infoLine1}
                    </p>
                    {batch.infoLine2 ? (
                      <p className="text-sm" style={{ color: batch.infoLine2Color ?? undefined }}>
                        {batch.infoLine2}
                      </p>
                    ) : null}
                    <div className="border-t-2 border-dashed border-line pt-2 text-xs text-muted">
                      {formatWeekdayKeys(batch.daysInWeek, locale)} ·{" "}
                      {formatTimeRange(batch.startTime, batch.endTime, locale)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t-2 border-line bg-surface-2">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-12">
          <div>
            <h2 className="text-xl font-bold">{t.portal.title}</h2>
            <p className="mt-1 text-sm text-muted">{t.portal.subtitle}</p>
          </div>
          <Button asChild size="lg">
            <Link href="/portal">
              <Wallet /> {t.portal.title}
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
