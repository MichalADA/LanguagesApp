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

- `backend/src/listening/importer/import-tako-lako.ts` — samodzielny
  skrypt kompilowany razem z resztą backendu przez `nest build`, uruchamiany
  ręcznie przez `npm run import:tako-lako` (odpala `node
  dist/listening/importer/import-tako-lako.js` — bez `ts-node`, bez
  devDependencies w runtime). **Nie uruchamia się przy starcie backendu.**
- Idempotencja:
  - `ListeningSource` upsertowany po `slug`.
  - `ListeningUnit` upsertowany po `(sourceId, level, position)`.
  - `ListeningLesson` upsertowany po `sourceUrl` (unikalny).
- Jeżeli sieć jest niedostępna (dev container, CI bez egress), skrypt
  wypisuje warning i wychodzi z kodem 0 — startowy seed pozostaje
  nietknięty.
- Parsowanie HTML jest wydzielone do `backend/src/listening/importer/tako-lako-parser.ts`
  (pure functions bez IO), żeby dało się je jednostkowo testować bez
  sieci ani Prismy.

### Konfiguracja

- `TAKO_LAKO_BASE_URL` (domyślnie `https://www.takolako.org`)
- `TAKO_LAKO_INDEX_URL` (domyślnie `${BASE}/beginner/content-overview/`)

### Skąd biorą się dane

Katalog beginner mieszka na `takolako.org`, a same lekcje na
`utexas.pressbooks.pub/takolako/chapter/uN-mM-lessonL[-type]/`.
Importer pobiera **tylko** stronę content-overview i wyciąga z niej
Pressbooksowe URL-e:

- `.../uN-mM-lessonL/` — główna lekcja (`sourceUrl` / `lessonUrl`),
- `.../uN-mM-lessonL-grammar/` → `grammarUrl`,
- `.../uN-mM-lessonL-vocabulary/` → `vocabularyUrl`,
- `.../uN-mM-lessonL-pronunciation/` → `pronunciationUrl`,
- `.../uN-mM-lessonL-video/` → `videoUrl`.

`/uN-overview/` jest ignorowane (nie jest lekcją). Fragmenty `#anchor`
są ucinane, a różne kotwice do tej samej strony są deduplikowane —
jeden Pressbooksowy chapter to jeden URL.

Importer **nie pobiera** treści Pressbooks (403 CloudFront z kontenera).
Transkrypcje, audio i teksty gramatyki są ładowane osobnym importerem
treści — patrz niżej.

## Importer treści lekcji

Osobny skrypt (`npm run import:tako-lako:content`) chodzi po
`ListeningLesson.sourceUrl` z bazy, próbuje pobrać każdą stronę
i zamienia HTML lekcji w semantyczne `ListeningContentBlock`-i.

Pipeline:

1. znajdź `ListeningLesson.sourceUrl` z bazy (z pominięciem tych, które
   są już `IMPORTED` — chyba że `TAKO_LAKO_CONTENT_FORCE=1`),
2. `fetch(url)` — na 403/404/451 lekcja dostaje `contentStatus =
   UNAVAILABLE`, na inny błąd `FAILED`, przy sukcesie idziemy dalej,
3. `parseLessonContent(html)` w `src/listening/importer/
   lesson-content-parser.ts` zwraca listę bloków. Parser:
   - lokalizuje główną treść (`.entry-content` → `article` → `main`),
   - iteruje po elementach i emituje `HEADING`, `PARAGRAPH`, `IMAGE`,
     `AUDIO`, `VIDEO`, `TRANSCRIPT`, `EXERCISE`, `NOTE`,
   - pomija nav/header/footer/aside/script/style oraz klasy
     `wp-block-navigation`, `menu-`, `sidebar`, `screen-reader`, …,
   - klasyfikuje `<iframe>` na `VIDEO` (YouTube/Vimeo) lub `EXERCISE`
     (H5P, Quizlet…),
4. w jednej transakcji importer wywala stare bloki dla lekcji
   i zapisuje nowe (`deleteMany` + `createMany`), ustawia
   `contentStatus = IMPORTED` (albo `PARTIAL` gdy brak paragrafów
   i transkrypcji), `contentImportedAt = now()`.

Statusy lekcji:

| Status         | Znaczenie                                                    |
| -------------- | ------------------------------------------------------------ |
| `NOT_IMPORTED` | Katalog załadowany, treści jeszcze nie próbowaliśmy.         |
| `IMPORTED`     | Treść lekcji zaimportowana i renderowana lokalnie w UI.      |
| `PARTIAL`      | Pobraliśmy stronę, ale wyszły tylko media / heading — brak paragrafów. |
| `FAILED`       | Błąd sieci lub inny HTTP; można ponowić.                     |
| `UNAVAILABLE`  | Źródło odmawia dostępu (403/404/451). Kolejne runy pomijają. |

### Konfiguracja treści

- `TAKO_LAKO_CONTENT_LIMIT` — maksymalna liczba lekcji na jeden run.
- `TAKO_LAKO_CONTENT_FORCE=1` — ponownie importuje treść nawet dla
  lekcji, które są już `IMPORTED`.

### Frontend

Widok lekcji renderuje bloki lokalnie (`ContentBlocks.tsx`):

- `HEADING` → `<h2/h3/h4>` w typografii Lexodromii,
- `PARAGRAPH` → tekst z line-heightem 1.6,
- `IMAGE` → responsywny `<img>` z alt-tekstem,
- `AUDIO` / `VIDEO` → HTML5 player albo iframe YouTube/Vimeo,
- `TRANSCRIPT` → osobna karta z rozpoznaniem rozmówców,
- `EXERCISE` → placeholder „Ćwiczenie dostępne w oryginalnym materiale”
  z linkiem do źródła (H5P nie osadzamy w tej iteracji),
- `NOTE` → cytat z paskiem akcentu.

Sekcja **Vocabulary coverage** analizuje **wyłącznie oryginalny
język źródła** (chorwacki) — czyli pola `sourceText` bloków +
tekst `TRANSCRIPT` jako legacy fallback. Polskie tłumaczenia
(`translatedText`), placeholdery UI, teksty licencji i cokolwiek
generowanego przez Lexodromię NIE wchodzą do analizy — brakujące
słowa są więc wyłącznie chorwackie. Attribution + licencja + link
„Otwórz oryginał” są stałą sekcją na dole lekcji, ale przycisk
„Otwórz oryginał ↗” pojawia się także w nagłówku lekcji obok
tytułu, żeby był w zasięgu wzroku.

## Model bloku treści

```
ListeningContentBlock {
  type       : HEADING | PARAGRAPH | IMAGE | AUDIO | VIDEO
             | TRANSCRIPT | EXERCISE | NOTE
  position   : Int
  sourceText : String?  ← analizowane przez coverage
  translatedText : String?  ← wyświetlane pod sourceText, muted
  speaker    : String?  ← opcjonalny label dla dialogu
  text       : String?  ← legacy display fallback
  url        : String?  ← src dla IMAGE / AUDIO / VIDEO / EXERCISE
  metadataJson : JSON   ← level dla HEADING, speakers dla TRANSCRIPT itd.
}
```

## Audio

Parser wyciąga URL nagrania z:

- `<audio src=”…”>`,
- pierwszego `<source src=”…”>` w środku `<audio>`,
- `<a href=”…mp3|m4a|ogg|wav”>` **wewnątrz** `<audio>` (Pressbooks
  często używa takiego fallback linku jako właściwego źródła),
- samodzielnego `<a href=”…mp3”>` bezpośrednio w treści lekcji.

W UI każdy blok `AUDIO` dostaje własny `<audio controls
preload=”metadata”>` renderowany w Lexodromii. Nie kopiujemy plików —
`src` prowadzi do oryginalnego URL. Kliknięcie Play nie przekierowuje
na źródło.

Jeżeli odtworzenie się nie powiedzie (403 / CORS / nieistniejący
URL), `onError` przełącza blok w tryb fallback z komunikatem
„Nie udało się odtworzyć nagrania” i linkiem „Otwórz nagranie
w źródle ↗”. Reszta lekcji renderuje się dalej.

## Reimport tej samej lekcji

Domyślnie `import:tako-lako:content` pomija lekcje ze
`contentStatus = IMPORTED`. Żeby wymusić ponowne przetworzenie:

```
TAKO_LAKO_CONTENT_FORCE=1 npm run import:tako-lako:content
```

Przy sukcesie stary zestaw bloków jest wywalany w jednej transakcji
(`deleteMany` po `lessonId`), a na jego miejsce wstawiany nowy —
żadne resetowanie bazy ani kasowanie rekordów lekcji nie jest
potrzebne.

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
