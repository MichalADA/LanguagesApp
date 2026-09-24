import { useT } from "@/i18n";
import { splitMinutes } from "../progress";

/** „55 min”, „1 h”, „7 h 20 min” — w języku interfejsu. */
export function useFormatMinutes() {
  const t = useT();
  return (total: number) => {
    const { hours, minutes } = splitMinutes(total);
    if (!hours) return t("curriculum.time.m", { m: minutes });
    return minutes ? t("curriculum.time.hm", { h: hours, m: minutes }) : t("curriculum.time.h", { h: hours });
  };
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Ścieżki kursu w jednym miejscu. */
export const coursePaths = {
  overview: "/kurs",
  module: (levelId: string, order: number) => `/kurs/${levelId.toLowerCase()}/modul/${order}`,
  lesson: (lessonId: string) => `/lekcja/${lessonId}`,
};
