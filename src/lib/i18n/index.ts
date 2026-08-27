import { bn } from "./dictionaries/bn";
import { en, type Dictionary } from "./dictionaries/en";
import { DEFAULT_LOCALE, type Locale } from "./config";

export const DICTIONARIES: Record<Locale, Dictionary> = { bn, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export * from "./config";
export * from "./format";
export type { Dictionary };
