/**
 * Cohort colour for the HSC year on the public batch schedule.
 *
 * The previous site coded the year by how far off it is, so a visitor could
 * pick out their own cohort at a glance. That mapping is reproduced here, with
 * the palette moved onto the RetroUI tokens instead of the old raw hexes. An
 * admin-chosen colour on the batch still wins, exactly as it used to.
 */

/** Token-backed colour per cohort, relative to the current calendar year. */
export function defaultHscYearColor(hscYear: string, now = new Date()): string {
  const year = Number(hscYear);
  if (!Number.isFinite(year)) return "var(--color-muted)";

  const offset = year - now.getFullYear();
  if (offset <= -1) return "var(--color-muted)";      // already graduated
  if (offset === 0) return "var(--color-danger)";     // sitting HSC this year
  if (offset === 1) return "var(--color-secondary)";  // next cohort
  if (offset === 2) return "var(--color-success)";    // the one after
  return "var(--color-info)";
}

/** The admin's colour if they set one, otherwise the cohort default. */
export function hscYearColor(
  batch: { hscYear: string; hscYearColor: string | null },
  now = new Date(),
): string {
  return batch.hscYearColor ?? defaultHscYearColor(batch.hscYear, now);
}
