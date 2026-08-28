/**
 * Ordering for the public batch schedule.
 *
 * A visitor scans this list to find the slot that fits them, so it reads by
 * when a batch meets — not by the admin's batch numbering. Ordering by weekday
 * then start time is what makes the column scannable.
 */

/** The Bangladeshi week starts on Saturday; Friday is the weekend. */
const WEEK_ORDER = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

/** Sorts after every real weekday, so undated batches fall to the bottom. */
const NO_DAY = Number.MAX_SAFE_INTEGER;

export interface OrderableBatch {
  hscYear: string;
  daysInWeek: readonly string[] | null;
  startTime: string | null;
  name: string | null;
}

/** Index of the earliest weekday a batch meets, Saturday counting as first. */
export function earliestWeekdayIndex(days: readonly string[] | null | undefined): number {
  if (!days?.length) return NO_DAY;

  let earliest = NO_DAY;
  for (const day of days) {
    const index = WEEK_ORDER.indexOf(day.trim().toLowerCase() as (typeof WEEK_ORDER)[number]);
    if (index !== -1 && index < earliest) earliest = index;
  }
  return earliest;
}

/** `"09:30"` / `"09:30:00"` → minutes since midnight. Unparseable → 0. */
export function startTimeMinutes(value: string | null | undefined): number {
  if (!value) return 0;
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute ?? 0);
  if (Number.isNaN(hour)) return 0;
  return hour * 60 + (Number.isNaN(minute) ? 0 : minute);
}

/**
 * Newest HSC year first, then earliest weekday, then earliest start time, then
 * the shorter week, then name — the same precedence the previous site used.
 */
export function comparePublicBatches(a: OrderableBatch, b: OrderableBatch): number {
  const yearA = Number(a.hscYear) || 0;
  const yearB = Number(b.hscYear) || 0;
  if (yearA !== yearB) return yearB - yearA;

  const dayA = earliestWeekdayIndex(a.daysInWeek);
  const dayB = earliestWeekdayIndex(b.daysInWeek);
  if (dayA !== dayB) return dayA - dayB;

  const timeA = startTimeMinutes(a.startTime);
  const timeB = startTimeMinutes(b.startTime);
  if (timeA !== timeB) return timeA - timeB;

  const countA = a.daysInWeek?.length ?? 0;
  const countB = b.daysInWeek?.length ?? 0;
  if (countA !== countB) return countA - countB;

  return (a.name ?? "").localeCompare(b.name ?? "");
}

export function sortPublicBatches<T extends OrderableBatch>(batches: readonly T[]): T[] {
  return [...batches].sort(comparePublicBatches);
}
