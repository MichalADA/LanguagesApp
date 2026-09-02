interface Props {
  characters: string[];
  /** Wywoływane ze znakiem do wstawienia w miejscu kursora. */
  onInsert: (char: string) => void;
}

/**
 * Pasek znaków języka docelowego. Zestaw pochodzi z kursu
 * (`course.specialCharacters`) — komponent nie wie nic o chorwackim.
 */
export function SpecialCharacters({ characters, onInsert }: Props) {
  if (characters.length === 0) return null;
  return (
    <div className="charbar" role="group">
      {characters.map((ch) => (
        <button
          key={ch}
          type="button"
          className="charbar-key"
          // onMouseDown zamiast onClick: zapobiega utracie fokusu przez pole.
          onMouseDown={(e) => {
            e.preventDefault();
            onInsert(ch);
          }}
          tabIndex={-1}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
