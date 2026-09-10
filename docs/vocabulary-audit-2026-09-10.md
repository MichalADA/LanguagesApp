# Audyt talii PL–HR — 10 września 2026

> Aktualizacja po audycie: wdrożono korektę 278 rekordów (433 pól treści),
> dodano jawną kolumnę AcceptedAnswers i kontrolę danych przed buildem.
> Poniżej zachowano historyczne wyniki audytu sprzed korekty.
> Dokładne zmiany: vocabulary-corrections-2026-09-10.csv.
> Zasady dalszej edycji: vocabulary-maintenance.md.

## Zakres i wynik

Plik: `frontend/public/data/chorwacki_2000_PL-HR.csv`, branch `feature/learning-levels`.
Przegląd wszystkich 3000 par Polish/Croatian, automatyczna kontrola struktury oraz
szczegółowe porównanie przykładów i gramatyki przy podejrzanych wpisach. Weryfikacja
słownikowa wybranych haseł. Nie jest to pełna korekta wszystkich zdań i odmian przez
native speakera. Niewymieniony rekord nie otrzymuje automatycznie certyfikatu poprawności.

Wniosek: talia wymaga korekty językowej przed traktowaniem jej jako wiarygodnego
materiału do samodzielnej nauki. Problemy obejmują błędy znaczenia, pisowni,
niedopasowanie aspektu czasowników oraz rozbieżności między hasłem i przykładem.
Nie zmieniono CSV, numeracji, postępów użytkowników ani konfiguracji poziomów.

## Kontrola danych

| Kontrola | Wynik |
|---|---:|
| Rekordy | 3000 |
| Rank | komplet 1–3000, bez powtórzeń |
| Nieprawidłowa liczba kolumn | 0 |
| Braki Polish/Croatian/ExampleCroatian/ExamplePolish | 0 |
| Techniczne zakresy | 6 × 500 |
| Różne zapisy Croatian, po trim i zamianie na małe litery | 2940 |
| Grupy powtarzających się zapisów Croatian | 56 |
| Nadmiarowe wystąpienia powtarzających się zapisów Croatian | 60 |
| Różne zapisy Polish, po tej samej normalizacji | 2924 |
| Identyczne pary Polish + Croatian | 0 |

Powtarzające się hasła mogą reprezentować różne znaczenia i nie należy ich automatycznie
usuwać. Liczba 2940 dotyczy zapisów, nie lematów: są tu również frazy i formy pokrewne.
„3000 słów” oznacza więc obecnie 3000 kart, nie 3000 różnych chorwackich słów.

## Wpisy wymagające korekty lub doprecyzowania

Numer to pole Rank, nie numer linii pliku. Propozycje są redakcyjne; przy wdrażaniu
trzeba jednocześnie uzgodnić Polish, Croatian, Grammar i oba przykłady.

| Rank | Obecna para | Problem i kierunek korekty |
|---:|---|---|
| 26 | kochać → ljubiti | Dla podstawowej komunikacji ustawić voljeti. Ljubiti ma również znaczenie miłosne, ale oznacza też całować; nie nazywać całego słowa archaizmem. Przykład rodzinny zmienić na Ona voli svoju djecu. |
| 163 | rano → jutro | Rzeczownik jutro odpowiada porankowi. Dla „rano” użyć ujutro; obecny przykład i tłumaczenie różnią się konstrukcją. Poprawić też notatkę o fałszywym przyjacielu. |
| 420 | mówić powoli → govoriti sporije | Sporije to „wolniej”; dopasować stopień. |
| 604 | smakować → imati dobar ukus | Dla smaku jedzenia preferować okus; obecny przykład używa zupełnie innego sformułowania. Ustalić, czy hasłem ma być „dobrze smakować”. |
| 605 | smak → ukus | Przy jedzeniu preferować okus i poprawić przykład; rozdzielić od gustu. |
| 684 | według mnie → prema meni | Jako podstawową odpowiedź ustawić po mom mišljenju. Obecny przykład używa mislim da, nie hasła. |
| 706 | spóźnienie w pracy → kašnjenje s rokom | Chodzi o opóźnienie względem terminu, co potwierdza polski przykład. Spóźnienie do pracy: kašnjenje na posao. |
| 889 | zbyt mało → previše malo | Ustawić premalo, już występujące w przykładzie i notatce. |
| 1020 | moment (właśnie teraz) → trenutno | Polski rzeczownik zastąpić „obecnie / w tej chwili”, zgodnie z przykładem. |
| 1032 | natychmiast → trenutno | Jako podstawową odpowiedź przyjąć odmah, już obecne w przykładzie i notatce. Nie utożsamiać wszystkich użyć trenutno z błędem. |
| 1112 | salata → salata | Polska literówka: sałata. W przykładzie również „sałatę”. |
| 1274 | wcześniejszy → ranije | Przymiotnik zestawiony z przysłówkiem. Zmienić PL na „wcześniej”, zgodnie z przykładem. |
| 1275 | późniejszy → kasnije | Zmienić PL na „później”, zgodnie z przykładem. |
| 1510 | kierunkowskaz → putokaz | Przykład dotyczy drogowskazu. Doprecyzować PL „drogowskaz”, aby nie sugerować kierunkowskazu samochodowego. |
| 1561 | wysportowany → sportski | Samo sportski to sportowy. Użyć konstrukcji opisującej osobę, np. u dobroj formi, i dopasować PL „w dobrej formie”. |
| 1614 | wieś (okolica) → okolica | Hasłem powinno być „okolica”, co potwierdza przykład. Wieś to selo. |
| 1655 | taniejać → pojeftiniti | Błędna polska forma. Dodatkowo uzgodnić aspekt: „stanieć”, a dla procesu dobrać odpowiedni czasownik niedokonany. |
| 1851 | półtora → sat i pol | Brakuje „godziny”: sat i pol to półtorej godziny, zgodnie z przykładem. |
| 2092 | osiąga zwycięstwo → pobjeda | Chorwacki rzeczownik: „zwycięstwo”. Przykład potwierdza. |
| 2140 | biec (dokoń.) → otrčati | Biec nie jest dokonane. Przykład mówi o pobiegnięciu po chleb; poprawić polskie hasło. |
| 2158 | pojawiać (przedmiot) → pokazivati | Zmienić PL na „pokazywać”; przykład: pokazuję zdjęcie. |
| 2165 | wspominać (przypomnieć) → podsjećati | Zmienić PL na „przypominać komuś”; przykład dotyczy przypomnienia o spotkaniu. |
| 2174 | należyć (być winnym) → dugovati | Błędny polski zapis i mylący czasownik. „Być komuś winnym / mieć dług”. |
| 2192 | podobać się (mniej mocno) → sviđati se | Usunąć „mniej mocno”. Różnica względem svidjeti se dotyczy aspektu, nie natężenia. |
| 2205 | bać się (perf) → uplašiti se | „Przestraszyć się”, zgodnie z przykładem. |
| 2485 | kotleta → odrezak | Poprawić polskie hasło i doprecyzować rodzaj dania; odrezak nie musi oznaczać polskiego panierowanego kotleta. |
| 2579 | tuzin → desetak | Desetak oznacza około dziesięciu, nie dwanaście. Poprawić hasło, gramatykę i tłumaczenie przykładu na „około dziesięciu osób”. |
| 2625 | wsi (mieszkaniec) → seljak | Uszkodzony polski opis. Doprecyzować „mieszkaniec wsi / chłop, rolnik” w wybranym znaczeniu. |
| 2632 | maluch (dziecko) → malčan | Podejrzana forma podstawowa. Rekomendowane słownikowe mališan; zmienić też przykład. Sam brak znalezienia malčan nie dowodzi nieistnienia w każdym dialekcie. |
| 2735 | fryzjerka salon → frizerski salon | Polski zapis: „salon fryzjerski”, zgodnie z przykładem. |
| 2761 | bułka → peciwo | Chorwacka pisownia: pecivo. Literówka powtórzona w przykładzie. Pecivo ma szersze znaczenie drobnego pieczywa. |
| 2766 | pierogi (typ) → okruglice | Przykład okruglice sa šljivama dotyczy knedli ze śliwkami, nie polskich pierogów. Dopasować hasło i tłumaczenie zdania. |
| 2962 | kluczowanie (do dostępu) → pristupna šifra | Polski opis: „kod dostępu”, ewentualnie hasło dostępu w odpowiednim kontekście. |
| 2973 | stała siedziba → prebivalište | W kontekście osoby: „miejsce stałego zamieszkania”, zgodnie z przykładem. |
| 2976 | wypełniać wniosek → podnijeti zahtjev | „Złożyć wniosek”, co potwierdza przykład. Wypełnianie i składanie to inne czynności. |

## Dalsza lista do weryfikacji kontekstu i rejestru

Poniższe pozycje nie są automatycznie błędne. Mogą być dopuszczalne w określonym
znaczeniu, regionie lub rozmowie, ale jako jednoznaczne pytanie w grze wymagają decyzji.

| Rank | Obecna para | Co rozstrzygnąć |
|---:|---|---|
| 185 | późno → pozno | Dla neutralnej codziennej talii rozważyć kasno. |
| 193 | za (zbyt) → previše | Doprecyzować konstrukcję; previše nie zastępuje każdego polskiego „za”. |
| 330 | czekać na coś (z niecierpliwością) → radovati se | Rozdzielić oczekiwanie od cieszenia się na coś. |
| 403 | przepraszam (zaczepiając) → izvinite | Ujednolicić standard chorwacki i rejestr, rozważyć oprostite. Nie usuwać regionalizmów bez sprawdzenia. |
| 439 | apteka → apoteka | Rozważyć ljekarna jako podstawową odpowiedź; apoteka nie jest automatycznie nieistniejącym słowem. |
| 478 | święta → praznici | Rozdzielić święta i dni wolne, uwzględnić blagdani. |
| 479 | wakacje → godišnji odmor | Urlop pracownika a wakacje szkolne. |
| 520 | kurs → kurs | Kurs językowy a inne znaczenia; rozważyć tečaj. |
| 535 | ślub → svadba | Ceremonia ślubna a wesele; porównać vjenčanje w 2213. |
| 542 | sklep spożywczy → samoposluga | Samoposluga akcentuje samoobsługę. |
| 559 | paragon → potvrda | Potwierdzenie jest pojęciem szerszym; doprecyzować dowód zakupu. |
| 596 | łóżko dwuosobowe → dvostruki krevet | Zweryfikować naturalne nazewnictwo hotelowe, np. bračni krevet. |
| 785 | samotny → sam | Bycie samemu a odczuwanie samotności (usamljen). |
| 920 | kontuzja → povreda | Rozważyć ozljeda jako standardowy wariant. |
| 973 | płatny → plaćen | „Opłacony” a „wymagający opłaty”. |
| 987 | kierownik → direktor | Zakres stanowiska; voditelj może odpowiadać innemu kontekstowi. |
| 1115 | wołowina → junetina | Mięso młodego bydła a wołowina ogólnie. |
| 1117 | szynka → pršut | Szynka suszona/dojrzewająca a szynka ogólnie (šunka). |
| 1120 | małże → dagnje | Dagnje to konkretnie omułki. |
| 1189 | spacerować z psem → izvesti psa | Spacerowanie a wyprowadzenie psa, także różnica aspektu. |
| 1261 | walizka podręczna → ručna prtljaga | Walizka a bagaż podręczny ogólnie. |
| 1264 | granica przejście → granični prijelaz | Polski zapis: przejście graniczne. |
| 1345 | awans → promocija | Zweryfikować znaczenie zawodowe i preferowany wariant. |
| 1350 | etat → radno mjesto | Wymiar zatrudnienia a stanowisko pracy. |
| 1490 | reszta (z pieniędzy) → ostatak | Kontekst kasowy a pozostała część pieniędzy; nie uznawać każdego użycia ostatak za błąd. |
| 1493 | kolejka górska (wyciąg) → uspinjača | Kolej linowo-terenowa a wyciąg/kolej linowa. |
| 1716 | prawnik → odvjetnik | Prawnik ogólnie a adwokat; porównać pravnik w 2724. |
| 1924 | dokonać wyboru → donijeti odluku | Wybór a podjęcie decyzji. |
| 2135 | zmniejszać (odjąć) → oduzeti | Zmniejszanie a odjęcie; także aspekt. |
| 2141 | wskakiwać → skakati | Wskakiwanie a skakanie ogólnie. |
| 2226–2229 | teść/teściowa i warianty | Konsekwentnie oznaczyć rodziców męża (svekar/svekrva) i żony (tast/punica). |
| 2260 | ciekawy → znatiželjan | „Ciekawy świata”, nie „interesujący”. |
| 2268 | niepełnosprawny → osoba s invaliditetom | Dopasować PL „osoba z niepełnosprawnością”. |
| 2314–2315 | na zewnątrz / wewnątrz → izvana / iznutra | Sprawdzić kierunek „z zewnątrz / od wewnątrz” w przykładach. |
| 2384 | niebo (rajska sfera) → raj | Doprecyzować PL „raj”. |
| 2398 | kręgosłup → kičma | Rozważyć standardowe kralježnica. |
| 2438 | lodziarnia → slastičarnica | Cukiernia może sprzedawać lody, lecz zakres znaczenia jest szerszy. |
| 2455 | dżem → pekmez | Rozróżnić typy przetworów owocowych. |
| 2586 | kredyt hipoteczny → stambeni kredit | Kredyt mieszkaniowy a zabezpieczony hipoteką. |
| 2660 | furtka → kapija | Furtka a brama. |
| 2672 | słońce (grzeje) → sunce grije | Ujednolicić jako zdanie „słońce grzeje”. |
| 2757 | bulion → juha od kokoši | Rosół/zupa z kury a bulion jako baza. |
| 2789 | wypadek (medyczny) → medicinski slučaj | Przypadek medyczny a wypadek. |
| 2790 | ambulans → hitna pomoć | Pojazd a służba ratunkowa; uwzględnić użycie potoczne. |
| 2846 | projekt (badawczy) → istraživanje | Badanie a projekt badawczy. |
| 2847 | informacja o osobie → osobni podaci | Precyzyjniej „dane osobowe”. |
| 2870 | otwarty (dostęp) → pristupačan | Dostępny/przystępny a otwarty. |
| 2876 | zaufany → povjerljiv | Rozdzielić poufny, ufny i godny zaufania. |
| 2981 | klient (usługa) → korisnik | Użytkownik a klient. |

## Systematyczny problem aspektu

Wiele polskich haseł niedokonanych odpowiada chorwackim dokonanym. Przykład zdania
czasami pasuje do chorwackiego hasła, ale nie do polskiego pytania; czasami używa
innego czasownika niż hasło. Nie naprawiać tego przez mechaniczne usuwanie prefiksów:
konieczna jest kontrola par aspektowych, czasowników dwuaspektowych i kontekstu.

Przykłady:

| Rank | Obecnie | Możliwy kierunek |
|---:|---|---|
| 23 | odpowiadać → odgovoriti | odpowiedzieć → odgovoriti lub odpowiadać → odgovarati |
| 31 | płacić → platiti | zapłacić → platiti lub płacić → plaćati |
| 35 | wstawać → ustati | wstać → ustati lub wstawać → ustajati; obecny przykład używa ustajem |
| 36 | otwierać → otvoriti | otworzyć → otvoriti lub otwierać → otvarati |
| 37 | zamykać → zatvoriti | zamknąć → zatvoriti lub zamykać → zatvarati |
| 45 | zapominać → zaboraviti | zapomnieć → zaboraviti lub zapominać → zaboravljati |
| 48 | zaczynać → početi | zacząć → početi lub zaczynać → počinjati; przykład używa počinje |
| 49 | kończyć → završiti | skończyć → završiti lub kończyć → završavati |
| 2003 | powstawać → nastati | powstać → nastati; nastajati jest już w 2004 |

Dodatkowa kolejka kontroli aspektu z przeglądu par (kandydaci, nie policzone potwierdzone błędy):

46, 335, 346, 347, 354, 355, 356, 358, 359, 360, 362, 504, 510, 511, 554,
642, 645, 646, 648, 649, 652, 653, 654, 661, 679, 680, 687, 689, 695, 696,
697, 698, 699, 700, 716, 717, 721, 722, 725, 735, 736, 751, 752, 804, 805,
818, 819, 826, 827, 832, 836, 837, 936, 937, 939, 944, 945, 984, 985,
1040, 1041, 1042, 1057, 1076, 1080, 1139, 1189, 1202, 1204, 1217, 1218,
1245, 1250, 1258, 1259, 1270, 1277, 1280, 1292, 1294, 1298, 1299, 1309,
1341, 1399, 1400, 1404, 1405, 1406, 1433, 1439, 1447, 1448, 1449, 1457,
1458, 1461, 1462, 1474, 1475, 1538, 1598, 1622, 1624, 1627, 1628, 1634,
1654, 1655, 1672, 1673, 1715, 1723, 1725, 1730, 1738, 1739, 1740, 1745,
1746, 1753, 1757, 1773, 1787, 1789, 1815, 1816, 1819, 1820, 1837, 1884,
1885, 1895, 1896, 1899, 1902, 1910, 1913, 1921, 1923, 1949, 1953, 1954,
1955, 1956, 1969, 1984, 2046, 2071, 2099, 2135, 2140, 2159, 2163, 2164,
2189, 2198, 2199, 2205, 2801, 2862, 2976.

## Sprawdzanie odpowiedzi w aplikacji

`frontend/src/services/validation.ts`, funkcja `acceptedAnswers`, czyta targetText
oraz pierwszy wariant oznaczony `też:`, `częściej:`, `potocznie:` lub `krócej:`.
Nie rozpoznaje `zwykle:`. Karta 26 zawiera dokładnie:

`1. os. sing.: ljubim - zwykle: voljeti`

Dlatego voljeti nie zostaje dodane jako poprawna odpowiedź przez tę funkcję.
To niezależny problem od doboru głównego hasła. Parsowanie opisowej gramatyki
jako listy odpowiedzi jest kruche: docelowo osobne, jawne pole wariantów odpowiedzi,
używane spójnie przez gry. Gry układania liter nadal potrzebują jednego poprawnego,
naturalnego hasła głównego; dodanie synonimu nie poprawi złych liter do układania.

Na screenie wpisane jest `lubjiti`, nie `ljubiti`; przestawienie liter uzasadnia
odrzucenie tej konkretnej odpowiedzi, ale nie rozwiązuje problemu jakości karty.
`Volim` oznacza „kocham/lubię”, a `voljeti` jest bezokolicznikiem „kochać/lubić”.

## Kolejność słów i poziomy

Obecny podział po Rank jest rozwiązaniem technicznym, nie zweryfikowanym programem CEFR.
Przykładowo wtorek/środa/czwartek/sobota trafiają dopiero powyżej 1000,
a rodzice do 2219. To sygnał do późniejszego audytu kolejności materiału.
Nie przestawiać teraz Rank: są podstawą identyfikatorów kart i zapisanych postępów.
Korekta powinna zachować identyfikatory oraz kumulacyjny podział A1/A2/B1.

## Wybrane źródła weryfikacji

- HJP, ljubiti: https://hjp.znanje.hr/index.php?id=e11lWhQ%3D&keyword=ljubiti&show=search_by_id
  — znaczenie całowania oraz znaczenia miłosne; część kontekstów oznaczona jako biblijna/literacka.
- HJP, voljeti: https://hjp.znanje.hr/index.php?id=f19vURJ%2B&keyword=voljeti&show=search_by_id
  — miłość, przywiązanie, upodobanie; prezent volim.
- HJP, desetak: https://hjp.znanje.hr/index.php?id=f1hjWxg%3D&show=search_by_id
  — około dziesięciu.
- HJP, mališan: https://hjp.znanje.hr/index.php?id=e1xnURU%3D&show=search_by_id
  — słownikowa forma mališan.
- HJP, okus: https://hjp.znanje.hr/index.php?id=eFpuXBQ%3D&show=search_by_id
- Institut za hrvatski jezik, kolokacje okus: https://ihjj.hr/kolokacije/search/?q=okus&search_type=basic
- Hrvatska enciklopedija, pekarski proizvodi: https://enciklopedija.hr/clanak/pekarski-proizvodi
  — zapis pecivo/peciva w opisie pieczywa.

Pozostałe uwagi wynikają z przeglądu językowego i porównania pól samej talii;
lista kontekstowa i kolejka aspektowa wymagają dalszej weryfikacji przed wdrożeniem.
