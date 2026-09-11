import { useEffect, useRef } from "react";

type Handler = (() => void) | null | undefined;

interface Options {
  enabled?: boolean;
  answers?: readonly Handler[];
  onSubmit?: Handler;
}

const ARROW_INDEX: Record<string, number> = {
  ArrowLeft: 0,
  ArrowUp: 1,
  ArrowRight: 2,
  ArrowDown: 3,
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function useQuizKeyboard(options: Options): void {
  const ref = useRef(options);
  ref.current = options;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const { enabled = true, answers, onSubmit } = ref.current;
      if (!enabled) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key;

      if (answers && answers.length && (key === "1" || key === "2" || key === "3" || key === "4")) {
        const index = Number(key) - 1;
        const cb = answers[index];
        if (cb) {
          event.preventDefault();
          cb();
        }
        return;
      }

      if (answers && answers.length && key in ARROW_INDEX) {
        const index = ARROW_INDEX[key];
        const cb = answers[index];
        if (cb) {
          event.preventDefault();
          cb();
        }
        return;
      }

      if (onSubmit && (key === "Enter" || key === " " || key === "Spacebar")) {
        event.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
