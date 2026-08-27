import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getDictionary } from "./index";

/** Reads the locale cookie. Cached per request so layouts and pages agree. */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(value)) return value;
  const fallback = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  return isLocale(fallback) ? fallback : DEFAULT_LOCALE;
});

/** `const { t, locale } = await getI18n()` inside any server component. */
export const getI18n = cache(async () => {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
});
