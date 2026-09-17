# Rozszerzenie chorwackiej talii do 5000 kart

Dodano dokładnie 2000 kart (Rank 3001–5000) do wersji `main`
`d8f37d3d5c1e3d24432452d9faec2bcc4737622f`. Dotychczasowe 3000 rekordów,
ich kolejność i identyfikatory pozostają identyczne bajtowo.
Nie zmieniono mechanizmu powtórek ani słuchania.

Priorytetem są brakujące podstawy i użyteczność w codziennych sytuacjach:
przedstawianie się, rozmowa, podróże, jedzenie, zakupy, dom, zdrowie,
praca, szkoła, technologia i sport. To dobór tematyczny, nie potwierdzony
korpusem ranking 5000 najczęstszych słów i nie certyfikowany poziom CEFR.

| Rodzaj nowych kart | Liczba |
| --- | ---: |
| Zwroty | 689 |
| Rzeczowniki i wyrażenia rzeczownikowe | 868 |
| Czasowniki i wyrażenia czasownikowe | 240 |
| Przymiotniki | 132 |
| Przysłówki | 43 |
| Zaimki | 15 |
| Przyimki | 5 |
| Spójniki | 4 |
| Partykuły | 4 |
| Razem | 2000 |

Pierwsza karta: **nazywam się → zovem se**, z przykładem
„Zovem se Marko.” i akceptowanym wariantem „ja se zovem”.
Następne karty obejmują „mam na imię”, „jak masz na nazwisko” i inne
podstawowe zwroty. Karty obejmują też pary aspektowe i wielowyrazowe nazwy;
2000 kart nie oznacza 2000 niezależnych lematów.

Nowe chorwackie hasła są unikalne względem starej talii i względem siebie
po normalizacji Unicode, wielkości liter, interpunkcji i odstępów.
Nie usunięto historycznych powtórzeń istniejącej talii, aby zachować postęp.

## Dostępność w aplikacji

- „Wszystkie słowa” oraz fiszki korzystają z 5000 rekordów.
- Gry korzystające z wyboru puli mają „Uzupełnienie podstaw” — 2000 nowych kart.
  Filtr tematyczny zawęża tę pulę bez powrotu do starej talii.
- A1, A2 i B1 obejmują odpowiednio 1000, 2000 i 5000 kart. Cztery nowe
  bloki techniczne dołączyły do poziomów CEFR zgodnie z zawartością:
  blok 7 (podstawowe zwroty, wszystkie z tagiem `podstawy`) do A1,
  blok 8 (codzienne rzeczowniki: jedzenie, dom, zdrowie, ubrania) do A2,
  bloki 9 i 10 (tematy specjalistyczne oraz mieszane czasowniki/przymiotniki)
  do B1. Cała talia (5000 kart) jest dzięki temu osiągalna z poziomu B1.
- Cztery nowe bloki techniczne liczą po 500 kart.

## Pochodzenie i jakość treści

Treść została opracowana z pomocą AI; status pozostaje `generated`.
Nie przeprowadzono pełnej korekty przez native speakera. Każda karta ma
polskie tłumaczenie oraz przykład chorwacki z polskim odpowiednikiem.
Większość nowych rzeczowników ma celowo proste zdania identyfikujące
„To je…” / „To su…”; zdania dla czasowników pokazują użycie w kontekście.
Zwroty będące całymi wypowiedziami występują również jako przykłady.
Warto w dalszej redakcji urozmaicać proste przykłady rzeczowników.

Wyrywkowo sprawdzono m.in.:
- formy przedstawiania się w [materiale do nauki chorwackiego](https://www.lets-learn.eu/croatian/guide/how-to-introduce-yourself-in-croatian),
- warianty „zaimača / kutlača / šeflja” w [Hrvatski jezični portal](https://hjp.znanje.hr/index.php?id=f15nWhh6&show=search_by_id),
- pisownię „tuš-kabina” i „pire-krumpir” w [Hrvatski pravopis](https://pravopis.hr/pravilo/pisanje-sa-spojnicom/24/).

Nie jest to audyt językowy wszystkich 2000 wpisów. Przykłady są własnym
materiałem, a nie skopiowaną bazą słownikową.

## Odtwarzanie i kontrola

Źródło redakcyjne: `tools/vocabulary/expansion-5000.txt`.
Każdy wpis zawiera hasło, tłumaczenie i dwa przykłady rozdzielone `|`.
Nagłówki sekcji określają część mowy i tematy.

Uruchom z katalogu repozytorium:

```sh
python tools/vocabulary/build-expansion.py
npm ci --prefix frontend --ignore-scripts
npm test --prefix frontend
npm run build --prefix frontend
```

Generator sprawdza hash oryginalnych 3000 kart, unikalność nowych haseł
i końcową liczbę 5000. Powtórne uruchomienie zastępuje tylko dodatek,
bez ponownego dopisywania tych samych rekordów. Wynikowy CSV jest w repozytorium;
aplikacja nie potrzebuje Pythona do działania.

Testy sprawdzają zgodność schematu, stabilność ID, hash oryginalnej części,
unikalność dodatku, przykłady, warianty przedstawiania się, działanie puli,
filtra tematycznego, wybieraka oraz tworzenie pytań w siedmiu szybkich grach.
Przy okazji uzupełniono brakujące mocki `useQuizKeyboard` w trzech istniejących
zestawach testów kliknięć; nie zmieniono produkcyjnej obsługi klawiatury.

Weryfikacja lokalna: 42 testy frontendu zaliczone; kontrola danych,
TypeScript i build Vite zakończone powodzeniem. Testy struktury nie dowodzą
poprawności językowej każdej karty.
