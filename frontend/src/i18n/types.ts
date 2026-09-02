/** Języki interfejsu. Dodanie kolejnego = nowy plik locale + wpis tutaj. */
export type UiLocale = "pl" | "en";

export const UI_LOCALES: { id: UiLocale; label: string }[] = [
  { id: "pl", label: "Polski" },
  { id: "en", label: "English" },
];

export const DEFAULT_LOCALE: UiLocale = "pl";

/** Wartości podstawiane w miejsce {placeholderów}. */
export type TParams = Record<string, string | number>;

export type Translator = (key: string, params?: TParams) => string;

/** Zagnieżdżony słownik tłumaczeń. */
export interface Dictionary {
  [key: string]: string | Dictionary;
}

export function lookup(dict: Dictionary, key: string): string | undefined {
  const parts = key.split(".");
  let node: string | Dictionary | undefined = dict;
  for (const p of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[p];
  }
  return typeof node === "string" ? node : undefined;
}

export function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) =>
    k in params ? String(params[k]) : m,
  );
}
