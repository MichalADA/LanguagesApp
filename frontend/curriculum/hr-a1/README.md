# Kurs chorwackiego A1 — źródła treści

```
lexodromia_hr_A1_curriculum.csv   ← źródło prawdy: lekcje, słownictwo, zdania, blueprinty ćwiczeń
didactics.json                    ← warstwa dydaktyczna: objaśnienia gramatyki, role zdań, dialogi,
                                     zadania swobodne, test A1, jawne poprawki treści (corrections)
        │
        ▼  npm run curriculum:a1   (scripts/generate-a1-curriculum.mjs, bez zależności)
src/curriculum/data/hr-a1/        ← wygenerowane TypeScript (commitowane, nie edytuj ręcznie)
  outline.ts                      ← 8 modułów × 5 lekcji dla /kurs
  lessons.ts                      ← leniwe ładowanie lekcji (osobny chunk na lekcję)
  module-XX/lesson-YY.ts          ← content (kroki playera) + material (pełne rekordy CSV + source_url)
```

- **Edycja treści:** zmień CSV (np. w arkuszu) albo `didactics.json`, potem `npm run curriculum:a1`.
- **Kontrola:** `npm run curriculum:a1:check` (uruchamiany też w `npm test`) sprawdza, czy wygenerowane pliki są aktualne.
- **Walidacja generatora:** wymagane pola, duplikaty `record_id`, brak rekordu `lesson`, zwykła lekcja bez słownictwa/zdań,
  8 modułów × 5 lekcji, nieaktualne poprawki, odwołania do nieistniejących zdań, błędne wzorce odpowiedzi.
- **Poprawki merytoryczne** nie są wpisywane do CSV, tylko do `didactics.json → corrections` (z uzasadnieniem).
  Generator sprawdza, czy CSV nadal zawiera oryginał; gdy poprawka trafi do CSV, zgłosi, że można ją usunąć.
- **Lekcja a1-02** („Skąd jesteś?”) to ręcznie napisana lekcja demo (`src/curriculum/data/lessons/a1-01-02.ts`);
  generator dołącza do niej słownictwo i materiał z CSV.
- **Audio:** ćwiczenia słuchania używają nagranych dialogów z `public/data/listening/hr-a1-dialogues.json`.
- **Build aplikacji nie potrzebuje CSV** — czyta tylko wygenerowane pliki.

## Audio

- `audio.json` — provider (edge-tts, jak w pilocie słuchania), głosy hr-HR, tempo, moduły z nagraniami.
- `audio-manifest.json` — generowany: każdy unikalny chorwacki tekst z lekcji wybranych modułów → stała ścieżka
  `/audio/hr/a1/module-XX/<slug>.mp3` (słowa, przykłady, dialogi, pytania, poprawne odpowiedzi, zwroty z celów
  i podsumowań, przykładowe wypowiedzi). Które miejsca w treści dostają audio, opisuje `scripts/lib/course-audio.mjs`.
- Nagrania syntezuje `tools/listening/generate_tts.py --course-manifest …` (szczegóły: tools/listening/README.md).
- Generator kursu dopisuje `audioSrc` do danych lekcji **tylko dla istniejących plików** — brak nagrania oznacza
  brak przycisku, nigdy 404. W UI jest jeden komponent: `src/components/AudioButton.tsx` (+ wspólny kanał
  `src/audio/player.ts`, który zatrzymuje poprzednie nagranie).
