# Lexodromia

Platforma do nauki języków przez granie. Ciemny, minimalistyczny interfejs, wspólny system postępu
dla wszystkich trybów, architektura wielojęzyczna od pierwszego dnia.

**Demo:** jeden pełny kurs **polski → chorwacki**, 2000 słów, trzy działające gry (Bura, Trasa, Odmiana) plus dataset odmiany ~100 czasowników.

React + TypeScript + Vite oraz backend NestJS + Prisma + PostgreSQL. Konto zapisuje sesje nauki
i statystyki w backendzie; tryb gościa pozostaje całkowicie lokalny.

---

## Uruchomienie

```bash
cp .env.example .env
docker compose up -d --build     # http://localhost:8080
```

Lokalnie:

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build
npm run typecheck
```

Backend udostępnia Swagger pod `http://localhost:3000/api/docs`, a readiness check pod
`http://localhost:3000/health/ready`.

---

## Trzy niezależne pojęcia językowe

| Pojęcie | Gdzie mieszka | Przykład |
| --- | --- | --- |
| **UI locale** — język interfejsu | `src/i18n`, klucz `lexodromia.locale` | `pl` albo `en` |
| **sourceLanguage** — z czego się uczysz | `Course.sourceLanguage` | `pl` |
| **targetLanguage** — czego się uczysz | `Course.targetLanguage` | `hr` |

Nigdzie w kodzie nie ma założenia, że UI locale równa się `sourceLanguage`. Interfejs po angielsku
z kursem polski → chorwacki działa dziś, bez żadnej zmiany.

---

## Struktura

```
app/src/
├── i18n/                    tłumaczenia interfejsu
│   ├── index.tsx            I18nProvider, useT, useI18n
│   ├── types.ts             UiLocale, lookup, interpolacja {placeholderów}
│   └── locales/{pl,en}.ts   słowniki
├── courses/                 model kursu (LanguagePack)
│   ├── types.ts             Course, ValidationRules, DatasetConfig, CourseRoute
│   ├── registry.ts          ← TUTAJ DODAJESZ KURS
│   └── CourseProvider.tsx   aktywny kurs + zapamiętanie wyboru
├── vocabulary/
│   ├── types.ts             ← VocabularyEntry (neutralny model + audioUrl)
│   ├── adapter.ts           CSV → VocabularyEntry wg mapowania kolumn z kursu
│   └── VocabularyProvider.tsx
├── progress/
│   ├── types.ts             ← WordProgress, JourneyProgress, GameRecord
│   ├── repository.ts        ← localStorage + migracja starych danych
│   ├── service.ts           logika domenowa: applyRound, isLearned, summarize
│   └── ProgressProvider.tsx
├── user/UserProvider.tsx    lokalny użytkownik, miejsce na auth
├── services/validation.ts   ← JEDYNA walidacja odpowiedzi
├── hooks/useWordPool.ts     wspólne filtrowanie puli słów
├── components/
│   ├── AppShell, Topbar, UserMenu, Logo
│   ├── AnswerInput          input + pasek znaków specjalnych
│   ├── SpecialCharacters    č ć đ š ž z kursu, nie z kodu
│   ├── PoolPicker, StatCard
│   └── maps/RouteMap.tsx    ← stylizowana mapa SVG (miejsce na Google Maps)
├── games/
│   ├── registry.ts          ← TUTAJ DODAJESZ GRĘ
│   ├── bura/                gra na czas (mechanika bez zmian)
│   ├── trasa/               podróż przez Chorwację, bez timera
│   └── odmiana/             odmiana czasowników, postęp per forma (czasownik + osoba)
└── pages/                   Dashboard, Games, Play, Review, Stats, Progress,
                             Courses, Profile, Settings, Login
```

---

## i18n

`t("nav.dashboard")` — zagnieżdżone klucze, podstawianie `{n}`, fallback na polski i ostrzeżenie
w konsoli przy braku klucza (tylko w dev). Wybór języka: Ustawienia → Interfejs, zapisywany pod
`lexodromia.locale`, ustawia też `<html lang>`.

Nowy język interfejsu: dopisz `src/i18n/locales/xx.ts`, dorzuć go do `DICTIONARIES` i `UI_LOCALES`.

Nazwy własne gier (Bura, Trasa, Odmiana) świadomie zostają nieprzetłumaczone — tłumaczone są ich opisy
(`gameList.*`).

---

## Course / LanguagePack

Kurs to jeden obiekt danych opisujący **wszystko, co językowo specyficzne**:

```ts
{
  id: "pl-hr",
  sourceLanguage: "pl", targetLanguage: "hr",
  name: { pl: "Chorwacki", en: "Croatian" },
  nativeName: "Hrvatski", flag: "🇭🇷",
  writingSystem: "latin",
  specialCharacters: ["č", "ć", "đ", "š", "ž"],
  validation: { caseInsensitive: true, trimWhitespace: true, diacriticsMatter: true, foldMap: {…} },
  dataset: { url, format, columns: { source: "Polish", target: "Croatian", … }, blockTagPattern },
  blocks: [{ id: "HR_0001_0500", range: "1–500" }, …],
  routes: [ { id: "jadran", answersPerLeg: 10, stops: [ { name: "Zagreb", x, y }, … ] } ],
  status: "available",
}
```

Gry nie znają chorwackiego. Czytają `course.specialCharacters`, `course.validation`,
`course.blocks`, `course.routes`.

### Jak dodać kolejny kurs (np. English → Polish)

1. Wrzuć dataset do `public/data/angielski-polski.csv` (dowolne nazwy kolumn).
2. W `src/courses/registry.ts` dopisz obiekt `Course`:
   `sourceLanguage: "en"`, `targetLanguage: "pl"`,
   `specialCharacters: ["ą","ć","ę","ł","ń","ó","ś","ź","ż"]`,
   `dataset.columns` mapujące Twoje nagłówki, własne `blocks` i opcjonalnie `routes`
   (np. Gdańsk → Zakopane).
3. Dodaj go do tablicy `COURSES`.

To wszystko. Postęp jest trzymany per `courseId`, więc kursy nie mieszają statystyk. Selektor
w prawym górnym rogu i ekran „Języki” pokażą nowy kurs same.

Kursy z cyrylicą: ustaw `writingSystem: "cyrillic"` i `specialCharacters` z odpowiednimi znakami.
Model danych i porównywanie odpowiedzi działają na pełnym Unicode (`normalize("NFC")`,
iteracja po punktach kodowych), więc nie ma tu nic do przepisywania.

---

## Gdzie co jest

| Element | Plik | Uwagi |
| --- | --- | --- |
| **VocabularyEntry** | `src/vocabulary/types.ts` | `sourceText`/`targetText`, `audioUrl?`, `contentStatus?` |
| **WordProgress** | `src/progress/types.ts` | attempts, correct/incorrect, lastSeen, lastCorrect, currentStreak, difficulty, markedDifficult |
| **Walidacja** | `src/services/validation.ts` | `checkAnswer(course, entry, input)` → `hit` / `near` / `miss` |
| **Pula słów** | `src/hooks/useWordPool.ts` | blok, trudne, błędne, poznane, tag |
| **Zapis** | `src/progress/repository.ts` | klucz `lexodromia.progress.v2` |
| **Mapa** | `src/components/maps/RouteMap.tsx` | czyste SVG, bez API |

### Punkty rozszerzeń — oznaczone w kodzie komentarzem `⬇`

- **SRS** — `src/progress/service.ts`, funkcja `applyRound`. `WordProgress` ma już puste pola
  `nextReview`, `interval`, `stability`, `reviewCount`. Wystarczy je wyliczyć po policzeniu
  `next` i wszystkie gry zaczną karmić jeden harmonogram powtórek.
- **Auth** — `src/auth/AuthContext.tsx` i `src/auth/authApi.ts`; access token żyje w pamięci,
  a rotowany refresh token w `HttpOnly` cookie.
- **Synchronizacja nauki** — `src/learning/useLearningSession.ts`; zalogowani zapisują sesje,
  odpowiedzi i statystyki w API, a gość nadal korzysta wyłącznie z lokalnego postępu.
- **Audio** — `VocabularyEntry.audioUrl` jest opcjonalne i dziś zawsze puste; brak wartości nie
  wywołuje żadnego błędu. Dodaj kolumnę do datasetu i zmapuj ją w `dataset.columns.audioUrl`.
- **Google Maps** — `src/components/maps/RouteMap.tsx`. Zastąp komponent implementacją o tym samym
  interfejsie (`route`, `stopIndex`, `legProgress`, `labels`); mechanika Trasy nie wie, czym jest
  rysowana mapa.
- **Native speaker review** — `VocabularyEntry.contentStatus` / `reviewedBy` / `reviewedAt`.
  Model aplikacyjny to przewiduje, CSV nie jest tym obciążony.

---

## Jak dodać nową grę

1. `src/games/<id>/<Nazwa>Game.tsx` — komponent bez propsów.
2. Dane bierz z gotowych warstw:

```ts
const { course } = useCourse();
const pool = useWordPool(selection);              // filtrowanie puli
const { verdict } = checkAnswer(course, entry, typed);   // walidacja
recordRound({ gameId, score, bestStreak, answered });    // zapis postępu
```

3. Pole odpowiedzi: `<AnswerInput characters={course.specialCharacters} … />` — dostajesz pasek
   znaków specjalnych i identyczne zachowanie klawiatury za darmo.
4. Dopisz wpis w `src/games/registry.ts` (`status: "active"`, `component`, klucze i18n opisów).

Routing `/gry/<id>`, kafelek na liście gier i rekord w Statystykach pojawią się automatycznie.

---

## Dataset gramatyczny i gra Odmiana

Odmiana czasownika to inne dane niż słowo z talii, więc ma własną, równoległą warstwę:

| Warstwa | Plik | Uwagi |
| --- | --- | --- |
| Dataset | `public/data/chorwacki_czasowniki_PL-HR.csv` | ~100 czasowników nieregularnych i trudnych, CSV `;`, pełna odmiana czasu teraźniejszego |
| Mapowanie kolumn | `Course.grammar` w `courses/registry.ts` | kurs bez tej sekcji po prostu nie oferuje gier gramatycznych |
| Parser | `grammar/adapter.ts` | kolumny po nazwach z nagłówka, jak przy słownictwie |
| Kontekst | `grammar/GrammarProvider.tsx` | `useGrammar()` → `{ verbs, loading, error, available }` |
| Gra | `games/odmiana/` | `logic.ts` (walidacja, punkty, wagi losowania) + `OdmianaGame.tsx` |
| Postęp | `CourseProgress.forms` | klucz `${verbId}:${person}`, struktura `FormProgress` = `WordProgress` + `verbId`/`person`/`label` |

Postęp jest liczony **per forma**, nie per czasownik: `ići + ja` i `ići + oni` to dwa osobne wpisy.
Wagę losowania liczy `weightForForm` — mylone formy wracają częściej, formy z długą serią trafień
niemal znikają. `applyGrammarRound` zapisuje rundę tym samym kanałem co gry słownikowe (dni aktywne,
rekordy gier, licznik prób), więc Pulpit i Statystyki widzą Odmianę bez zmian w tych ekranach.
`formsToReview` jest gotowym wejściem dla Powtórek i Dzisiejszego treningu, a pola `nextReview` /
`interval` / `stability` czekają na SRS w tym samym miejscu co przy słowach.

Prototyp do klikania bez uruchamiania Vite: `../Odmiana - odmiana czasowników.dc.html` w katalogu głównym repo.

---

## Kolory

Cała identyfikacja siedzi w zmiennych CSS w `src/styles.css` (`:root`) — żaden komponent nie
zna wartości hex. Kierunek: **bardzo ciemne ciepłe tło + głęboka bizantyjska czerwień + mało
przygaszonego złota + ciepła kość słoniowa**. Proporcje w przybliżeniu 80 / 15 / 5.

| Rola | Token | Gdzie |
| --- | --- | --- |
| Powierzchnie | `--bg`, `--bg-2`, `--panel`, `--panel-2`, `--panel-hover` | tło, karty, hover kart |
| Ramki | `--line`, `--line-2` | ciepłe, nie szare |
| Tekst | `--text`, `--muted`, `--dim` | kość słoniowa i jej przygaszenia |
| Czerwień — wypełnienia | `--accent`, `--accent-hover`, `--accent-deep` | przyciski, pasek rozgrywki, aktywna nawigacja, fokus |
| Czerwień — tekst i ikony | `--accent-text`, `--accent-text-hover` | linki, aktywna nawigacja, chipy, znaczniki osób |
| Czerwień — tła i ramki | `--accent-soft`, `--accent-line` | zaznaczenia, hover kart |
| Złoto | `--gold`, `--gold-light`, `--gold-soft`, `--gold-line` | serie, rekordy, opanowanie, włosowe separatory |
| Semantyka | `--good`, `--warn`, `--bad` | trafienie / „prawie" / błąd |

Dwie zasady, które trzymają ten system:

1. **Czerwień marki nie jest kolorem błędu.** Błąd to `--bad` (jaśniejsza, inna czerwień),
   trafienie to `--good` (stonowana zieleń), „prawie" to `--warn` (złoto).
2. **Złoto = nagroda.** Postęp nauki jest czerwony (`.bar`), opanowanie złote (`.bar.gold`,
   `ProgressBar tone="mastery"`), a `StatCard tone="gold"` dostają tylko serie i rekordy.

---

## Uczciwie: co jeszcze pachnie chorwackim

1. `COURSE_PL_HR` w `registry.ts` — z definicji, to dane kursu.
2. `public/data/chorwacki_2000_PL-HR.csv` — dataset demo.
3. Klasy CSS `.example-hr` i `.example-pl` w `styles.css` — nazwy historyczne; stylują „zdanie
   w języku docelowym” i „w źródłowym”. Do przemianowania przy okazji, zero wpływu na logikę.
4. Trasa działa tylko wtedy, gdy kurs ma `routes` — dla kursu bez trasy gra pokaże komunikat
   zamiast planszy. To świadome ograniczenie danych, nie kodu.
5. Warianty odpowiedzi w `acceptedAnswers` rozpoznają polskie etykiety z pola `Grammar`
   („też:”, „częściej:”). To cecha tego konkretnego datasetu — przy kursie z innym opisem gramatyki
   trzeba będzie wzorzec sparametryzować w `Course`.

---

## Migracja danych ze starej wersji

Pierwsze uruchomienie automatycznie przenosi postęp z kluczy `bura.progress.v1` i `bura-best`
do `lexodromia.progress.v2`, pod kurs `pl-hr`. Statystyki słów ze starego formatu odzyskują się
przy pierwszym kontakcie z danym słowem (mapowanie po formie docelowej).

---

## Kolejne sensowne kroki

1. **Fiszki** — mają już wszystko: `VocabularyEntry`, `WordProgress`, walidację, rejestr gier.
2. **SRS** — dopiero po Fiszkach; wtedy `nextReview` zaczyna mieć sens dla czterech trybów naraz.
3. **Drugi kurs** — najlepszy test architektury; realnie to jeden plik CSV plus jeden obiekt.
4. **Audio** — `speechSynthesis` z `lang` z kursu jako namiastka, zanim będą prawdziwe nagrania.
5. **Backend** — najpierw postęp (`ProgressRepository`), dopiero potem konta.
# LanguagesApp
