"use client";

import * as React from "react";

import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n";

interface I18nValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (next: Locale) => void;
}

const I18nContext = React.createContext<I18nValue | null>(null);

export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  // Keep client state in step when a server navigation changes the cookie.
  React.useEffect(() => setLocaleState(initialLocale), [initialLocale]);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    // A year-long cookie: the choice is a preference, not a session detail.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dataset.locale = next;
    // Server components render their own copy of the dictionary, so the tree
    // has to be re-fetched for the language to change everywhere at once.
    window.location.reload();
  }, []);

  const value = React.useMemo<I18nValue>(
    () => ({ locale, t: getDictionary(locale), setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = React.useContext(I18nContext);
  if (!context) {
    // A component rendered outside the provider still needs *some* copy rather
    // than a crash — fall back to the default locale.
    return { locale: DEFAULT_LOCALE, t: getDictionary(DEFAULT_LOCALE), setLocale: () => {} };
  }
  return context;
}
