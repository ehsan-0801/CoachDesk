export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "bn";
export const LOCALE_COOKIE = "coachdesk_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  bn: "বাংলা",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Bengali digits, used for numbers, dates and currency in the `bn` locale. */
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toLocaleDigits(value: string | number, locale: Locale): string {
  const text = String(value ?? "");
  if (locale !== "bn") return text;
  return text.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export const MONTH_NAMES: Record<Locale, string[]> = {
  bn: [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
};

export const WEEKDAY_NAMES: Record<Locale, string[]> = {
  bn: ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

export const WEEKDAY_SHORT: Record<Locale, string[]> = {
  bn: ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

/** Weekday keys stored in `batches.days_in_week`, kept English in the database
 *  so the data does not change meaning when the UI language does. */
export const WEEKDAY_KEYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];
