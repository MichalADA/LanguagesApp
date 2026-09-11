# Wspólny system powtórek Lexodromii

## Źródło prawdy i tożsamość

Backend wyznacza terminy przez `ts-fsrs@5.2.3` (dokładna wersja w lockfile).
`ReviewItem` to para `itemType + itemId`. Dane treści pozostają w istniejących
plikach CSV, a identyfikatory zawierają kurs:

| Materiał | Przykład itemId |
| --- | --- |
| WORD | `pl-hr:42` — istniejący identyfikator VocabularyEntry |
| SENTENCE | `pl-hr:sentence:a1-01` — identyfikator rekordu, bez trybu gry |
| VERB | `pl-hr:verb:1:ja` — czasownik i konkretna osoba |
| GRAMMAR / PHRASE | przestrzeń rozszerzeń; nowa treść wymaga adaptera zadania |

`ReviewState` ma UNIQUE `(userId, itemType, itemId)`. Gra ani kierunek tłumaczenia
nie są częścią tego klucza. To samo słowo w Bura, Trasie, fiszkach i quizie ma jeden
harmonogram. Wszystkie pięć trybów tego samego zdania też aktualizuje jeden rekord.
Odmiana zachowuje istniejący identyfikator konkretnej formy czasownika.

Pełne zdanie sprawdza wiedzę o zdaniu. Nie zaliczamy automatycznie wszystkich słów,
które się w nim pojawiają — bez jawnego powiązania zadania z konkretnym wordId nie
wiemy, czy użytkownik zna każde z nich. Przyszłe zadanie kontekstowe dotyczące
konkretnego słowa powinno wysyłać jego istniejący WORD/itemId.

## Stan i historia

`ReviewState` przechowuje pełny Card FSRS: state, stability, difficulty, due,
lastReview, scheduledDays, elapsedDays, learningSteps, reps i lapses. Dodatkowo
zachowuje liczby odpowiedzi, flagę trudności i pochodzenie z migracji.

`ReviewAttempt` to osobny, nieedytowany zapis każdej próby: materiał, użytkownik,
kurs, gameType, direction, odpowiedź, correct, rating, nullable responseTimeMs,
usedHint, attemptsBeforeCorrect, terminy/stability/difficulty przed i po oraz
wersja schedulera. Nieznany czas nie jest zastępowany wymyśloną wartością.

Zapis próby, zmiana stanu i liczników sesji odbywają się w jednej transakcji.
Blokada PostgreSQL `pg_advisory_xact_lock` na użytkowniku serializuje jego równoległe
odpowiedzi ze wszystkich urządzeń. Nie blokuje innych kont (poza teoretyczną kolizją
64-bitowego hasha). Wszystkie ścieżki zapisujące sesje pobierają tę blokadę przed
innymi blokadami, aby uniknąć odwrotnej kolejności blokowania.

UNIQUE `(userId, eventId)` zapewnia idempotencję. Retry musi zachować całe body i
eventId. Powtórzenie nie zwiększa reps ani liczników sesji. Użycie eventId z inną
odpowiedzią/oceną/metadanymi daje 409. Kolejna rzeczywista próba ma nowe eventId.
Starsze klienty bez eventId nadal działają przez adaptery, ale nie uzyskują tej
samej gwarancji deduplikacji — po aktualizacji należy przeładować frontend.

## Scheduler i ocena

Parametry startowe: standardowe parametry biblioteki, desired retention 0.9,
fuzz wyłączony dla przewidywalnego harmonogramu. Nie ma własnej tabeli interwałów.
To początkowa konfiguracja, nie obietnica 90% skuteczności dla każdego użytkownika.

Centralny `rating-mapper.ts`, w kolejności pierwszeństwa:

| Wynik | Warunek |
| --- | --- |
| Again | błędna odpowiedź |
| Hard | poprawna z podpowiedzią, po wcześniejszym błędzie lub po ponad 60 s |
| Hard | zadania rozpoznawania: pary, łączenie kolumn, wybór, tak/nie, intruz, układanie/scramble |
| Easy | poprawna bez pomocy, stability >= 30, zmierzony czas 0–4 s (granice wyłączne) |
| Good | pozostałe poprawne odpowiedzi |

Brak pomiaru czasu nigdy nie daje Easy. Bura, gry zdaniowe i mieszane powtórki
przekazują pomiar; inne istniejące gry mogą zostawić go null. Poprzednie błędy
w sesji zbiera wspólny hook. Podpowiedź w zdaniu jest zapamiętana nawet po ukryciu.
To jawna heurystyka produktu, nie naukowo skalibrowane wagi między grami.

Status UI wynika z FSRS: reps=0 → NEW; stan Learning/Relearning → LEARNING;
stan Review → REVIEW; stan Review + stability >=30 dni + >=3 poprawne odpowiedzi
→ MASTERED. Ostatni próg jest polityką produktu, wspólną dla backendu i UI przez
odpowiedzi API. Kolejny błąd może odebrać MASTERED. Flaga „trudne” jest niezależna.
Gość zachowuje lokalne wyniki; nie ma lokalnego schedulera FSRS.

Implementacja i podstawy modelu:
- https://github.com/open-spaced-repetition/ts-fsrs
- https://github.com/open-spaced-repetition/fsrs4anki/wiki/ABC-of-FSRS
- https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm

## API

Wszystkie endpointy wymagają istniejącego JWT. userId pochodzi wyłącznie z tokenu.
Przy zwykłym uruchomieniu aplikacji prefiks to `/api`.

| Metoda | Endpoint | Znaczenie |
| --- | --- | --- |
| GET | `/api/reviews/due?course=pl-hr&limit=20` | due <= teraz, najstarsze najpierw; opcjonalne language=hr i itemType=WORD |
| GET | `/api/reviews/stats?course=pl-hr` | agregaty konta/kursu |
| GET | `/api/reviews/progress?course=pl-hr&cursor=...` | kompatybilny snapshot materiału, strony po 500 i kursor |
| POST | `/api/reviews/answer` | automatyczny rating, FSRS i historia |

Przykład body (eventId generowany raz na próbę, sessionId opcjonalny):

```json
{
  "eventId": "4b07bd28-250a-4304-bdab-d07dd37d4a4f",
  "course": "pl-hr",
  "itemType": "WORD",
  "itemId": "pl-hr:42",
  "gameType": "review-translation",
  "direction": "SOURCE_TO_TARGET",
  "answer": "kuća",
  "correct": true,
  "responseTimeMs": 6200,
  "usedHint": false,
  "attemptsBeforeCorrect": 0
}
```

Serwer waliduje strukturę, własność sesji i przestrzeń kursu. Tak jak istniejące
gry przyjmuje correct od klienta, którego CSV zawiera klucz odpowiedzi. To nie jest
serwerowa walidacja wiedzy ani system odporny na oszukiwanie rankingów.

`due` ogranicza rekordy w SQL (1–100), nie pobiera całej historii do pamięci.
Indeksy: userId+due, userId+courseId+itemType+due, userId+courseId+id,
unikalny userId+itemType+itemId oraz indeksy historii po użytkowniku/kursie/czasie.

## Integracja gier i sesja

Fiszki korzystają z dotychczasowych endpointów przez adapter ReviewsService.
Po odpowiedzi wystarcza „Dalej”; rating jest automatyczny. Stary scheduler SM-2
został usunięty z kodu wykonywalnego.

Bura, Trasa, Odmiana, sześć ocenianych szybkich gier i pięć gier zdaniowych korzysta
ze wspólnego `useLearningSession({gameType})` i LearningService.recordAnswer.
Swipe oznacza materiał jako trudny na życzenie, nie udaje obiektywnego testu.
Radio nie zmienia FSRS. Poziomy A1/A2/B1 pozostają bez zmian.

Nowa gra słownikowa:

```ts
const learning = useLearningSession({ gameType: "new-game" });
learning.start(course.id);
learning.record({ wordRef: entry.id, answer, correct, usedHint, responseTimeMs });
await learning.finish();
```

Nowy rodzaj materiału: nadaj stabilny identyfikator kursowy, zgłoś go przez
`/reviews/answer` z itemType, dodaj rozwiązywanie treści i prezentację w
`frontend/src/reviews/tasks.ts`. Nie twórz drugiego schedulera ani osobnego stanu
pamięci dla kolejnej gry. GRAMMAR/PHRASE są obsługiwane przez model/API; nie mają
jeszcze katalogu treści ani generatorów zadań w obecnej aplikacji.

`/powtorki` pobiera 20 najstarszych due. Adapter miesza wpisywanie PL→HR, HR→PL,
wybór odpowiedzi, zdania/luki i formy czasowników zgodnie z dostępnością materiału.
Nie wprowadza do FSRS całej talii. Nieznane rekordy są pomijane z komunikatem,
a ich historia pozostaje nienaruszona.

Po błędzie element wraca po trzech innych zadaniach, najwyżej dwa razy w sesji.
Jeżeli zostały mniej niż trzy inne zadania, pozostaje z terminem Again na kolejną
sesję — nie pokazujemy natychmiast tej samej odpowiedzi. Każdy powrót jest nowym
attempt. Sesja wykorzystuje istniejący LearningSession; zamknięcie jest idempotentne.
Przy błędzie sieci w powtórkach/fiszkach użytkownik ponawia ten sam zapis.

## Statystyki

`/reviews/stats` udostępnia liczbę materiałów NEW/w nauce/MASTERED, due i overdue
(zaległe o ponad 24 h), accuracy 7/30 dni, liczbę odpowiedzi/błędów,
grupy gameType+direction+correct ze średnim zmierzonym czasem, najczęściej
zapominane słowa (lapses, następnie difficulty) i prognozę następnych 7 dni.
`seen/new/learning/mastered` w tym endpointcie dotyczą wszystkich typów materiału.
Accuracy i grupy obejmują historię od uruchomienia FSRS; brak prób daje null.
Prognoza obejmuje terminy przyszłe; do bieżących due służy osobny licznik.
Daty kalendarzowe/seria dni używają Europe/Warsaw, okna 7/30 dni są ruchome.

Ogólne statystyki liczą zakończone LearningSession i FlashcardSession, także stare,
bez podwójnego liczenia ReviewAttempt. Stan opanowania pochodzi z ReviewState.
Seria dni mierzy dni aktywności, również z błędnymi odpowiedziami, nie serię
bezbłędnych sesji. Pulpit i statystyki mają wspólny panel powtórek i PL/EN.
Reset lokalnych wyników gier nie usuwa historii konta.

## Migracja i uruchomienie

Migracja `20260911140000_unified_fsrs` działa transakcyjnie przez standardowe Prisma.
Zachowuje stare tabele jako źródło historyczne. UserWordProgress przenosi terminy,
liczniki, flagi i firstSeen. LearningAnswer dodaje tylko faktycznie ćwiczony materiał;
tryby tego samego zdania są scalane. Stare eventy nie są fabrykowane w ReviewAttempt.

Brakuje pełnej historii dawnych ocen, więc stan FSRS zaczyna z reps/stability=0,
z zachowaniem dotychczasowego due. Pierwsza nowa odpowiedź inicjuje prawdziwy Card.
Liczba „opanowane” może się zmniejszyć: stary status nie dowodzi stabilności FSRS.
Dane historyczne i wyniki gier nie są kasowane. Nie uruchamiaj jednocześnie starego
backendu zapisującego SM-2 i nowego backendu FSRS.

Z katalogu backend, z DATABASE_URL wskazującym właściwą bazę:

```sh
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run build
```

Następnie uruchom nowy backend i przebudowany frontend (`npm ci`, `npm run build`
w frontend). Nie stosuj `db push`. Dockerfile/Compose nie wymaga zmian; nowa wersja
potrzebuje przebudowania obu obrazów i zastosowania migracji w bazie.

## Weryfikacja

```sh
npm run typecheck --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
npm run typecheck --prefix backend
npm test --prefix backend -- --runInBand
npm run build --prefix backend
# testowa baza PostgreSQL i zmienne jak w .github/workflows/ci.yml:
npm run prisma:migrate --prefix backend
npm run prisma:seed --prefix backend
npm run test:e2e --prefix backend
```

Testy obejmują A–I ze specyfikacji, pełny cykl FSRS, rollback, retry, równoczesne
unikalne odpowiedzi, deduplikację, migrację z wypełnionego starego schematu, wspólne
zdania i mieszaną sesję UI. Test migracji tworzy własny schemat w bazie testowej;
użytkownik testowy potrzebuje uprawnienia CREATE SCHEMA.
Repozytorium nie miało działającej konfiguracji lint: backend ma skrypt eslint,
ale bez zainstalowanego ESLint/konfiguracji; frontend nie ma skryptu lint.

Ręcznie:
1. Zaloguj się, odpowiedz na to samo słowo w dwóch grach i fiszkach w przeciwnym
   kierunku. W ReviewState ma być jeden rekord, w ReviewAttempt osobne próby.
2. Dla konta testowego ustaw due wybranego rekordu w przeszłości. Otwórz panel
   „Powtórki na dziś” i `/powtorki`; sprawdź kolejność i mieszane typy zadań.
3. Popełnij błąd przy co najmniej czterech zadaniach, przejdź trzy inne, odpowiedz
   ponownie. Sprawdź Again, a potem Hard i dwa oddzielne eventId.
4. W DevTools zablokuj zapis, potem przywróć sieć i ponów. Liczniki nie mogą wzrosnąć
   dwukrotnie. Sprawdź konto B — nie może zobaczyć żadnego materiału konta A.
5. Sprawdź PL/EN, układ na telefonie, zamknięcie sesji i ponowne otwarcie strony.

## Dalszy rozwój

Optymalizacja parametrów z rzeczywistej historii, osobne analizy receptive/productive
bez mnożenia kart, lepsza kalibracja ocen rozpoznawania, dodatkowe adaptery treści,
konfigurowalna strefa czasowa, serwerowa walidacja odpowiedzi, trwały offline outbox
we wszystkich grach i dzienne agregaty przy dużej historii. Obecny wspólny hook gier
kolejkuje zapisy w pamięci; awaria sieci nie zapewnia trwałego zapisu po zamknięciu
karty przeglądarki. Nie jest to jeszcze tryb offline z synchronizacją między urządzeniami.
