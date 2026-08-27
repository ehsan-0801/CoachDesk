import { MONTH_NAMES, WEEKDAY_NAMES, WEEKDAY_SHORT, toLocaleDigits, type Locale, type WeekdayKey } from "./config";

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value == null || value === "") return null;
  // A bare `YYYY-MM-DD` is parsed as UTC midnight by the Date constructor, which
  // shifts a day backwards for anyone west of Greenwich. Build it as local time.
  if (typeof value === "string") {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `12 August 2026` / `১২ আগস্ট ২০২৬` */
export function formatDate(value: DateInput, locale: Locale): string {
  const date = toDate(value);
  if (!date) return "—";
  const day = toLocaleDigits(date.getDate(), locale);
  const month = MONTH_NAMES[locale][date.getMonth()];
  const year = toLocaleDigits(date.getFullYear(), locale);
  return locale === "bn" ? `${day} ${month} ${year}` : `${day} ${month} ${year}`;
}

/** `12/08/2026` — compact form for dense tables. */
export function formatDateShort(value: DateInput, locale: Locale): string {
  const date = toDate(value);
  if (!date) return "—";
  const parts = [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getFullYear()),
  ].join("/");
  return toLocaleDigits(parts, locale);
}

export function formatMonthYear(month: number, year: number, locale: Locale): string {
  const name = MONTH_NAMES[locale][Math.max(0, Math.min(11, month - 1))];
  return `${name} ${toLocaleDigits(year, locale)}`;
}

export function formatWeekday(value: DateInput, locale: Locale, short = false): string {
  const date = toDate(value);
  if (!date) return "—";
  return (short ? WEEKDAY_SHORT : WEEKDAY_NAMES)[locale][date.getDay()];
}

/** Stored weekday keys are English; render them in the active locale. */
export function formatWeekdayKey(key: string, locale: Locale, short = false): string {
  const index = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(
    key.toLowerCase(),
  );
  if (index < 0) return key;
  return (short ? WEEKDAY_SHORT : WEEKDAY_NAMES)[locale][index];
}

export function formatWeekdayKeys(keys: readonly string[] | null | undefined, locale: Locale, short = true): string {
  if (!keys?.length) return "—";
  return keys.map((k) => formatWeekdayKey(k as WeekdayKey, locale, short)).join(", ");
}

/** `09:30 AM` → `৯:৩০ AM`, accepting both `HH:mm` and `HH:mm:ss`. */
export function formatTime(value: string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  const [rawHour, rawMinute] = value.split(":");
  const hour24 = Number(rawHour);
  if (Number.isNaN(hour24)) return value;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${toLocaleDigits(hour12, locale)}:${toLocaleDigits(rawMinute ?? "00", locale)} ${suffix}`;
}

export function formatTimeRange(start: string | null | undefined, end: string | null | undefined, locale: Locale) {
  if (!start && !end) return "—";
  return `${formatTime(start, locale)} – ${formatTime(end, locale)}`;
}

export function formatNumber(value: number | string | null | undefined, locale: Locale): string {
  if (value == null || value === "") return toLocaleDigits(0, locale);
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return toLocaleDigits(0, locale);
  return toLocaleDigits(new Intl.NumberFormat("en-US").format(n), locale);
}

/** Amounts are always BDT; `৳` reads correctly in both languages. */
export function formatCurrency(value: number | string | null | undefined, locale: Locale): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  const safe = Number.isNaN(n) ? 0 : n;
  const rounded = Number.isInteger(safe) ? safe : Math.round(safe * 100) / 100;
  return `৳${toLocaleDigits(new Intl.NumberFormat("en-US").format(rounded), locale)}`;
}

export function formatPercent(value: number, locale: Locale, digits = 0): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${toLocaleDigits(safe.toFixed(digits), locale)}%`;
}

export { toLocaleDigits };
