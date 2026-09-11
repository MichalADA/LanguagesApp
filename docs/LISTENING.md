# Listening / Słuchanie

Moduł „Słuchanie" — materiały audio i wideo z transkrypcjami oraz analizą
słownictwa. Zaprojektowany tak, że Tako Lako to jedno z wielu przyszłych
źródeł (`ListeningSource`), a nie hardkodowana ścieżka.

## Nawigacja

```
Tryby nauki (/gry)
└── Słuchanie                     → /listening
    └── Tako Lako                 → /listening/tako-lako
        └── Beginner / Intermediate
            └── Unit
                └── Lekcja        → /listening/tako-lako/lessons/:id
                    ├── audio player
                    ├── video player
                    ├── transkrypcja z podziałem na rozmówców
                    ├── vocabulary coverage
                    └── brakujące słowa
```

Karta „Słuchanie" na ekranie **Tryby nauki** jest teraz aktywna i linkuje
do `/listening`. Radio jest osobnym trybem — nie zostało przeniesione.

## Model danych (Prisma)

Trzy nowe modele w `backend/prisma/schema.prisma`, migracja
`20260911170000_listening_module`:

- `ListeningSource` — źródło (Tako Lako, przyszłe podcasty, importy YouTube).
  `slug` unikalny; `type` to enum `ListeningSourceType` (`TAKO_LAKO`,
  `USER_UPLOAD`, `PODCAST`, `VIDEO`, `YOUTUBE`).
- `ListeningUnit` — rozdział/moduł źródła (`level`, `position`, `title`).
  Unikalny `(sourceId, level, position)`.
- `ListeningLesson` — pojedyncza lekcja z `sourceUrl` (unikalny),
  `transcript`, `audioUrl`, `videoUrl`. Cała treść trzymana jako tekst
  albo linki do zewnętrznych zasobów — **nie kopiujemy plików
  audio/video do repo ani storage** na tym etapie.

Baza jest w tym kroku *dodawana*, nigdy nie resetujemy wolumenów.

## Backend

- `backend/src/listening/listening.module.ts` rejestruje moduł w
  `AppModule`.
- `ListeningService` + `ListeningController` udostępniają:
  - `GET /api/listening/sources`
  - `GET /api/listening/sources/:slug`
  - `GET /api/listening/sources/:slug/units` (z zagnieżdżonymi lekcjami)
  - `GET /api/listening/lessons/:id` (z unit + source)
- `backend/src/common/transcript/normalize.ts` — reusable normalizacja
  i tokenizacja (lowercase, usuwa interpunkcję, ale zachowuje `č ć đ š ž`).
- `backend/src/common/transcript/coverage.ts` — `computeCoverage(transcript, knownSet)`.

Analiza transkrypcji **nie jest zaszyta w importerze Tako Lako** —
`normalize.ts` i `coverage.ts` będą tymi samymi funkcjami, których
w przyszłości użyje pipeline `audio → Whisper → transcript →
transcriptAnalysisService → vocabulary coverage`.

## Frontend

- `frontend/src/listening/` — mini-moduł: `types.ts`, `api.ts`
  (fetch z `/api/listening/*`), `transcriptAnalysis.ts`, trzy strony.
- Routy w `App.tsx`:
  - `/listening` → `ListeningHubPage` (karta Tako Lako aktywna, trzy
    placeholdery „Wkrótce": Własne materiały, Podcasty, Import audio/video).
  - `/listening/:slug` → `ListeningSourcePage` (Unity pogrupowane po
    `level`, każdy Unit ma listę lekcji).
  - `/listening/:slug/lessons/:lessonId` → `ListeningLessonPage`.
- `transcriptAnalysisService` (`transcriptAnalysis.ts`) chodzi po CSV
  kursu — używa `useVocabulary().entries`. Nie tworzymy równoległej bazy
  słownictwa; źródłem prawdy jest istniejący dataset kursu `pl-hr`.

## Importer Tako Lako

- `backend/scripts/import-tako-lako.ts` — samodzielny skrypt, uruchamiany
  ręcznie przez `npm run import:tako-lako`. **Nie uruchamia się przy
  starcie backendu.**
- Idempotencja:
  - `ListeningSource` upsertowany po `slug`.
  - `ListeningUnit` upsertowany po `(sourceId, level, position)`.
  - `ListeningLesson` upsertowany po `sourceUrl` (unikalny).
- Jeżeli sieć jest niedostępna (dev container, CI bez egress), skrypt
  wypisuje warning i wychodzi z kodem 0 — startowy seed pozostaje
  nietknięty.
- Parsowanie HTML jest wydzielone do `backend/src/listening/importer/
  tako-lako-parser.ts` (pure functions bez IO), żeby dało się je
  jednostkowo testować bez sieci ani Prismy.

### Konfiguracja

- `TAKO_LAKO_BASE_URL` (domyślnie `https://takolako.com`)
- `TAKO_LAKO_INDEX_URL` (domyślnie `${BASE}/lessons`)

### Startowy seed

`backend/prisma/seed.js` dodaje minimalny katalog Tako Lako (2 lekcje
Beginner + 1 Intermediate) z transkrypcjami. UI pokazuje realną treść
zaraz po `docker compose up` bez uruchamiania scrapera. Kiedy scraper
wejdzie na prawdziwe dane, upsert po `sourceUrl` sam nadpisze seed.

## Vocabulary coverage — jak jest liczone

1. `useVocabulary().entries` zwraca listę `VocabularyEntry` z CSV kursu.
2. `buildKnownSet(entries)` tokenizuje `targetText` (i `acceptedAnswers`)
   każdej pozycji tym samym pipeline'em co transkrypcja lekcji.
3. Dla lekcji `analyzeTranscript(transcript, knownSet)` zwraca:
   ```
   {
     totalWords,      // wszystkich tokenów w transkrypcji
     uniqueWords,     // unikalnych tokenów
     knownWords,      // z tego w bazie
     missingWords,    // z tego brakujących
     coveragePercent, // knownWords / uniqueWords * 100
     known, missing,  // listy tokenów
   }
   ```

Lista brakujących słów pojawia się w UI, ale **nie jest automatycznie
dopisywana do talii kursu** — to celowe, żeby nie zanieczyścić FSRS
i istniejących danych użytkownika.

## Przyszłość — Whisper

Architektura zostawia jeden punkt wpięcia:

```
plik audio/video   →  Whisper transcribe  →  string transcript
                                              ↓
                        transcriptAnalysisService (już istnieje)
                                              ↓
                        ListeningLesson.transcript zapisany
                                              ↓
                        UI vocabulary coverage bez zmian
```

Nowy komponent (np. `backend/src/whisper/`) wywoła
`prisma.listeningLesson.update({ where: { id }, data: { transcript } })`
i UI podniesie analizę „za darmo".

## Uruchomienie

```
docker compose up -d --build
docker compose exec backend npm run prisma:migrate
docker compose exec backend npm run prisma:seed
docker compose exec backend npm run import:tako-lako   # opcjonalnie, gdy scraper ma dostęp do sieci
```

`docker compose down -v` **nie jest potrzebne** — wolumeny PostgreSQL
mają pozostać.
