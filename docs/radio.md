# Radio

Route: `/radio` (także przekierowania ze starych `/gry/radio` i `/gry/kategoria/radio`).
Moduł korzysta z istniejącej ochrony tras i designu aplikacji. Radio na ekranie trybów
nauki ma status aktywny i prowadzi bezpośrednio do odtwarzacza. Pozostałe kategorie
pozostają bez zmian.

## Dane

Jeden fetch w `frontend/src/radio/api.ts`:

https://de1.api.radio-browser.info/json/stations/search?countrycode=HR&hidebroken=true&order=votes&reverse=true&limit=20

Wyniki są dodatkowo sprawdzane po stronie klienta: kraj HR, lastcheckok równe 1,
niepusty identyfikator i nazwa, poprawny URL HTTP(S). Powtórzone UUID są pomijane.
Wyszukiwanie i filtry działają lokalnie na pobranych 20 stacjach. Filtr Music
rozpoznaje ogólne tagi muzyczne i popularne gatunki; Talk / News rozpoznaje tagi
talk/news/vijesti/spoken/informativ. Nie ma listy stacji wpisanej w kodzie.
Fetch ma timeout 15 sekund, obsługę anulowania przy wyjściu oraz przycisk ponowienia.

Żądanie zawiera `User-Agent: Lexodromia/0.1`. Przeglądarki mogą zastąpić ten nagłówek
własnym (Chromium go ignoruje w fetch); frontend nie może zagwarantować jego
faktycznej wartości na przewodzie. Nie dodano backendu ani proxy tylko z tego powodu.

Źródła: https://docs.radio-browser.info/ oraz
https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_request_header

## Odtwarzanie

Jeden HTMLAudioElement dla całej strony. Kliknięcie stacji zatrzymuje poprzednie
odtwarzanie i ustawia url_resolved. Player ma play/pause, natywne regulatory
(w tym głośność tam, gdzie udostępnia ją przeglądarka) i zatrzymanie zwalniające src.
Wyjście ze strony zatrzymuje stream. Odrzucone play(), błąd audio i brak rozpoczęcia
odtwarzania w 20 sekund pokazują komunikat błędu. Odrzucona obietnica poprzedniej
stacji nie zmienia stanu nowej. Błędy logo zamieniają obraz na fallback.

Nie ma proxy streamów, przepisywania HTTP na HTTPS, historii, ulubionych ani zapisu
postępu. Obsługa kodeków i dostępność streamów zależą od przeglądarki i nadawcy;
lastcheckok to wynik ostatniego sprawdzenia Radio-Browser, nie gwarancja odsłuchu.

## Weryfikacja

- API na żywo zwróciło m.in. Extra FM, Radio Banovina i Radio Dalmacija.
- Testy modułu: filtrowanie, walidacja API, pojedynczy player, zmiana stacji,
  ignorowanie starego odrzucenia play(), błąd streamu, stop, fallback logo i retry.
- `npm run typecheck`, `npm run build`, `npm test`.
- Siatka korzysta z istniejących breakpointów: 3 kolumny, 2 poniżej 900 px,
  1 poniżej 560 px. Karty zawijają długie nazwy i tagi.
- Ręczny odsłuch i wizualna kontrola mobile nie zostały potwierdzone w środowisku
  wykonawczym: zdalna przeglądarka blokowała localhost (ERR_BLOCKED_BY_CLIENT),
  a próba sprawdzenia streamów zakończyła się anulowaniem zgody sieciowej.

Po pobraniu zmian: `docker compose up -d --build frontend`.
