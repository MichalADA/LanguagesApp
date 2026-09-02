import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { pl } from "./locales/pl";
import { en } from "./locales/en";
import type { Dictionary, TParams, Translator, UiLocale } from "./types";
import { DEFAULT_LOCALE, interpolate, lookup } from "./types";

const DICTIONARIES: Record<UiLocale, Dictionary> = { pl, en };
const LOCALE_KEY = "lexodromia.locale";

interface I18nApi {
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  t: Translator;
}

const Ctx = createContext<I18nApi | null>(null);

function readStoredLocale(): UiLocale {
  try {
    const raw = localStorage.getItem(LOCALE_KEY);
    if (raw === "pl" || raw === "en") return raw;
  } catch {
    /* tryb prywatny */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "";
  return nav === "en" ? "en" : DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>(readStoredLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: UiLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      /* noop */
    }
  }, []);

  const t = useCallback<Translator>(
    (key: string, params?: TParams) => {
      const hit = lookup(DICTIONARIES[locale], key) ?? lookup(DICTIONARIES[DEFAULT_LOCALE], key);
      if (hit === undefined) {
        if (import.meta.env.DEV) console.warn(`[i18n] brak klucza: ${key}`);
        return key;
      }
      return interpolate(hit, params);
    },
    [locale],
  );

  const value = useMemo<I18nApi>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n musi być wewnątrz <I18nProvider>");
  return ctx;
}

/** Skrót, gdy komponent potrzebuje tylko tłumaczenia. */
export function useT(): Translator {
  return useI18n().t;
}

export type { UiLocale } from "./types";
export { UI_LOCALES } from "./types";
