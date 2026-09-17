# Utrzymanie talii

Źródłem danych pozostaje `frontend/public/data/chorwacki_2000_PL-HR.csv`.
Nazwa historyczna; plik zawiera 5000 kart. Nie zmieniać Rank istniejących kart:
aplikacja wiąże z nimi postępy. Nie usuwać powtarzających się słów automatycznie,
bo mogą przedstawiać różne znaczenia. Nowe karty dopisywać z kolejnymi numerami.

## Jedna karta, jedno znaczenie

Polish i Croatian muszą opisywać to samo znaczenie, część mowy i aspekt.
Dobierać zwykły współczesny chorwacki jako odpowiedź główną. Dopuszczalne regionalne
warianty mogą pozostać odpowiedziami dodatkowymi. Przykład powinien demonstrować
hasło lub jego odmianę, a nie inny czasownik z tej samej rodziny.
Każda zmiana hasła wymaga sprawdzenia Grammar, obu przykładów i FalseFriendNote.
Rozdzielać „płacić” od „zapłacić”, „kocham” od „kochać” oraz dosłowne znaczenie od
znaczenia zależnego od kontekstu. Unikać polskich dopisków perf/impf zamiast poprawnej formy.

## Poprawne warianty odpowiedzi

Kolumna `AcceptedAnswers` zawiera tablicę JSON chorwackich odpowiedzi, np.
`["bok","ćao"]`. `[]` oznacza tylko odpowiedź główną z Croatian.
Nie powtarzać odpowiedzi głównej na tej liście. Przy zapisie CSV biblioteka zapisze
cudzysłowy zgodnie z regułami CSV — używać parsera/zapisywacza CSV, nie dzielenia po średniku.
Pole nie może zawierać polskich tłumaczeń, opisów gramatycznych ani innych aspektów.
Opisowe „też”, „częściej” i podobne notatki w Grammar nie są już interpretowane
jako odpowiedzi w tej talii. Starsze datasety bez kolumny zachowują kompatybilność.

## Kontrole

W katalogu frontend:

```sh
npm run check:data
npm test
npm run build
```

Kontrola danych uruchamia się również automatycznie przed buildem, w tym podczas
budowania obrazu Docker i w istniejącym CI. Wykrywa braki pól, uszkodzone wiersze,
przerwy i duplikaty numeracji, niezgodne zakresy tagów, niepoprawne listy odpowiedzi
oraz regresje znanych błędów. Testy gier sprawdzają również obecne pule poziomów.
Kontrola struktury nie wymaga limitu 3000 i działa po rozszerzeniu pliku.
Przy świadomym dodaniu nowych poziomów należy uaktualnić centralną konfigurację
poziomów i związane z nią testy. Nie pokazywać technicznych bloków w UI.

Automatyczne testy nie potwierdzają poprawności językowej nowych tłumaczeń.
Przed dodaniem kolejnej partii sprawdzić znaczenia w źródle słownikowym, zweryfikować
przykłady i zapisać wynik przeglądu. Wpisów poprawionych przez AI nie oznaczać jako
zweryfikowanych przez native speakera.

## Korekta 2026-09-10

Poprawiono 278 rekordów i 433 pola treści. Osobno wszystkie 3000 rekordów dostały
jawną listę wariantów; 103 karty mają dodatkowe odpowiedzi. Dziennik zmian pól
treści znajduje się w `vocabulary-corrections-2026-09-10.csv`.
Zachowano numery, identyfikatory i tagi zakresów. Nie przestawiano kolejności słów
według CEFR. Celowo zachowano dopuszczalne użycia zależne od kontekstu, np.
`ostatak` jako resztę i `isplatiti se` w wyrażeniu „opłaca się”.

Naprawiono wykryte problemy i powiązane przykłady. Nie jest to deklaracja pełnej
korekty wszystkich 3000 zdań przez native speakera. Historyczny audyt zawiera też
listę miejsc do dalszego sprawdzenia kontekstu i rejestru.

Zmiana dotyczy frontendu. Po pobraniu zmian wystarczy:

```sh
docker compose up -d --build frontend
```

Następnie odświeżyć stronę, aby ponownie wczytać CSV. Backend i baza danych nie
wymagają migracji z powodu tej korekty.
