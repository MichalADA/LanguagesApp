import { useCallback, useEffect, useRef } from "react";
import { SpecialCharacters } from "./SpecialCharacters";

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  placeholder: string;
  /** Znaki języka docelowego — z aktywnego kursu. */
  characters: string[];
  /** Zmiana tej wartości przywraca fokus (np. przy nowym słowie). */
  focusKey?: string | number;
  disabled?: boolean;
}

/**
 * Wspólne pole odpowiedzi w języku docelowym: input + pasek znaków specjalnych.
 * Używają go wszystkie gry, żeby zachowanie klawiatury było identyczne.
 */
export function AnswerInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  characters,
  focusKey,
  disabled,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disabled) return;
    const id = window.setTimeout(() => ref.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [focusKey, disabled]);

  const insert = useCallback(
    (char: string) => {
      const el = ref.current;
      if (!el) {
        onChange(value + char);
        return;
      }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? start;
      const next = value.slice(0, start) + char + value.slice(end);
      onChange(next);
      // Kursor ląduje za wstawionym znakiem, fokus zostaje w polu.
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + char.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [value, onChange],
  );

  return (
    <div className="answer-input">
      <input
        ref={ref}
        className="field"
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <SpecialCharacters characters={characters} onInsert={insert} />
    </div>
  );
}
