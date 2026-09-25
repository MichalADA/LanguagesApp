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
- **Dwie warstwy słownictwa** (kolumna `tags`): `vocab|active` — 8 słów rdzenia na lekcję (osobne karty i ćwiczenia),
  `vocab|supplement` — słowa uzupełniające (moduły 02–08): jedna lista „Więcej przydatnych słów” z nagraniami,
  jedno rozpoznanie i fiszki. Zdania z tagiem `example` trafiają do kroku „Nowe słowa w zdaniach” (z nagraniem, bez oceny).
  Generator zgłasza słowo powtórzone w lekcji i ostrzega, gdy słowo uzupełniające jest już w rdzeniu innej lekcji.
- **Dialog wzorcowy:** `didactics.json → lessons.<id>.model = { title, lines: [{ speaker, hr, pl }] }` → krok `listen`
  przed rozmową z partnerem. Głos wynika z mówiącego (`audio.json → maleSpeakers`).
- **Repliki w dialogach** (`didactics.json → dialog.turns[].reply.pattern`) to ramy zdań. Sloty rozwija generator
  w formy słownictwa całego kursu (`scripts/lib/hr-morphology.mjs`): `{acc}` biernik, `{loc}` miejscownik,
  `{ins}` narzędnik, `{inf}` bezokolicznik, `{inft}` „radit” (radit ću), `{pres1}` 1 os. czasu teraźniejszego,
  `{pp.self}` imiesłów m/ż, `{adj.f}` / `{adj.m}` / `{adj.self}` przymiotnik, `{pred}` orzecznik (sunčano, vruće),
  `{nom}` mianownik rzeczownika (Ja sam student), `{pres1.bare}` 1 os. bez „se” (Navečer se obično odmaram).
  Replika o sobie (w odpowiedzi jest „sam” albo „bih”) automatycznie przyjmuje obie formy rodzaju.
  Generator odrzuca dane, w których sugerowana odpowiedź nie pasuje do własnej ramy.
  Każda replika dostaje grzecznościową ramę: na początku „Bok / Dobar dan / Hvala / Oprostite / imię rozmówcy”,
  na końcu „hvala / a ti? / molim / imię” („Bok, dobro sam, hvala, a ti?” = „Dobro sam.”).
  `open: true` oznacza replikę otwartą — polecenie dopuszcza wiele treści (jak się masz, co pijesz, dokąd idziesz,
  co robiłeś wczoraj…). Taka replika musi mieć ramę zdania, a nie jedną odpowiedź; generator sprawdza, że
  przechodzi „Bok, <sugestia> hvala”. Naturalne i błędne odpowiedzi dla każdej otwartej repliki są w
  `tests/fixtures/open-replies.mjs` — dodając otwartą replikę, dopisz ją tam (test pilnuje zgodności listy).
  Replika zamknięta (bez `open`) to polecenie „powiedz, że…” z konkretną treścią.
- **Gramatyka** (`lessons.<id>.grammar`) może mieć `table: [{ label, rows: [{ base, form, meaning }] }]` — np. liczby,
  sat / sata / sati, radim · radiš · radi. `choices[].targetText` mówi, gdzie jest chorwacki (`prompt` = zdanie do
  odsłuchania, np. cena; domyślnie `options`). Powtórka modułu też może mieć `grammar`, `choices` i `translate` na
  własnych zdaniach (np. „Ne razumijem” w a1-05) — pojawiają się przed dialogiem, który ich wymaga.
- **Karty słów:** słowo jest nową kartą tylko w jednej zwykłej lekcji; lekcja ma 8–10 kart w grupach po 2–3.
  Nowe słowo = nowy `record_id` (identyfikator nie jest używany ponownie dla innego słowa, bo trafia do fiszek).
- **Tłumaczenia** dostają naturalne warianty: drugi rodzaj w zdaniu o sobie (poza lekcją z `genderDrill: true`)
  i opcjonalne „Ja” na początku zdania bez klityk.
- **Powtórki, Wielka powtórka i test** składa generator z materiału, który uczeń już widział, ale nigdy tym samym
  zadaniem co wcześniej (tłumaczenie / luka / układanie / pytanie o słowo); kopia zatrzymuje generowanie.
  Spirala i test w `didactics.json` wskazują tylko, z których lekcji i modułów brać materiał.
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
- `npm run curriculum:a1` wypisuje pokrycie nagrań per moduł i lekcje z brakującymi plikami;
  `npm run curriculum:a1:audio-check` kończy się błędem, dopóki któregoś nagrania z manifestu brakuje na dysku.
- Generator kursu dopisuje `audioSrc` do danych lekcji **tylko dla istniejących plików** — brak nagrania oznacza
  brak przycisku, nigdy 404. W UI jest jeden komponent: `src/components/AudioButton.tsx` (+ wspólny kanał
  `src/audio/player.ts`, który zatrzymuje poprzednie nagranie).
