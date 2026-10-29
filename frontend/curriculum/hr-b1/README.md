# Kurs chorwackiego B1 — plan poziomu (12 modułów, 60 lekcji)

Status: **gotowe moduły 01–09** (b1-01 – b1-45, z nagraniami); kolejne — plan poniżej. Poziom powstaje tak jak A2:
moduł po module, w tym samym formacie i tym samym generatorem:

```
level.json                          ← poziom: B1, prefiks b1, "modules" = liczba gotowych modułów; dziedziczy słownictwo hr-a1 i hr-a2
lexodromia_hr_B1_curriculum.csv     ← źródło prawdy: lekcje, słownictwo, zdania, blueprinty
didactics.json                      ← gramatyka, dialogi z ramami odpowiedzi, zadania swobodne
audio.json / audio-manifest.json    ← nagrania w /audio/hr/b1/module-XX/
        │
        ▼  npm run curriculum:b1   (scripts/generate-curriculum.mjs --level hr-b1)
src/curriculum/data/hr-b1/          ← wygenerowane TypeScript (commitowane, nie edytuj ręcznie)
```

- **Nowy moduł:** dopisz lekcje do CSV i `didactics.json`, zwiększ `"modules"` w `level.json`, potem
  `npm run curriculum:b1` → `python tools/listening/generate_tts.py --course-manifest frontend/curriculum/hr-b1/audio-manifest.json` → `npm run curriculum:b1`.
  Otwarte repliki dopisz do `OPEN_REPLIES` w `tests/curriculum-b1.test.mjs`.
- **Dialogi do słuchania:** `public/data/listening/hr-b1-dialogues.json` (nagrania: `python tools/listening/generate_tts.py --manifest frontend/public/data/listening/hr-b1-dialogues.json`).
  Gra „Słuchanie” pokaże B1 (`AVAILABLE_LISTENING_LEVELS`), gdy dialogów będzie tyle co w A2.
- **Odmiana:** nieregularne formy nowych czasowników dopisz w `PRES_OVERRIDES` / `PP_OVERRIDES` (`scripts/lib/hr-morphology.mjs`);
  moduł 01 dodał m.in. popijem, pojedem, počnem, prestanem, obučem, uspijem.
- **Moduł 01 „Svakodnevica i navike”:** pary aspektowe piti / popiti, čitati / pročitati, obući se (b1-01), dok + niedokonany
  i szyk Dok je Ana glačala (b1-02), prije nego što krenem / nakon što sam završila / prije spavanja (b1-03),
  početi / prestati + bezokolicznik, naviknuti se na, uspjeti, sve češće (b1-04), powtórka: typowy tydzień (b1-05).
  Dialogi do słuchania: b1-kucanski-poslovi (b1-02), b1-nove-navike (b1-04).

## Zasady

- **Łagodne przejście z A2.** Każdy moduł zaczyna się od rozgrzewki na tym, co uczeń zna z A2 (numer lekcji A2 w opisie),
  i dokłada jedną nową strukturę B1 naraz.
- **Rytm modułu (5 lekcji):** 1 — rozgrzewka z A2 + nowy kontekst; 2–3 — nowa struktura B1 i słownictwo;
  4 — zastosowanie komunikacyjne + kolejne pary aspektowe; 5 — konsolidacja (mini-dialog, praktyka mieszana).
- **Aspekt jest nicią przewodnią:** pary wprowadzane w module 01 wracają w każdym kolejnym module (lekcja 4).
- **Słownictwo:** zakres słów 1–3000 z `LEARNING_LEVELS` (`src/config/learningLevels.ts`). Dataset często ma tylko jeden
  człon pary aspektowej (np. `počinjati` 48, bez `početi`) — drugi człon pary znanego czasownika liczy się jako mieszczący się w limicie.
- **Lekcje specjalne:** b1-58 rozmowa, b1-59 Wielka powtórka (spirala), b1-60 test — jak w A2 (`"special"` w `level.json`).

## Siatka lekcji

### Faza 1: Od A2 do B1 — czas, aspekt i plany (b1-01 – b1-20)

**Moduł 01 `Svakodnevica i navike`** — aspekt czasownika i równoczesność
- b1-01 *Jutarnja rutina* — rozgrzewka: znane czasowniki z A2 w parach niedokonany / dokonany (piti / popiti, jesti / pojesti, čitati / pročitati).
- b1-02 *Dok pijem kavu…* — zdania równoczesne z `dok` (podczas gdy).
- b1-03 *Prije nego što krenem* — następstwo: `prije nego što` (zanim), `nakon što` (po tym jak).
- b1-04 *Dobre i loše navike* — przysłówki częstotliwości i zmiana nawyków (naviknuti se na, prestati, početi).
- b1-05 *Moj tipičan tjedan* — konsolidacja: opowiadanie o zmianach w rutynie.

**Moduł 02 `Uspomene i prošla ljeta`** — narracja w przeszłości i szyk enklityk
- b1-06 *Kako je bilo na moru?* — rozgrzewka: perfekt z A2 (a2-01 – a2-04) + pary kupovati / kupiti, spremati / spremiti.
- b1-07 *Čim smo stigli…* — `čim` (gdy tylko) i `tek kad` (dopiero gdy) w opowiadaniu.
- b1-08 *Gdje stoji „sam, si, je”?* — zasada drugiego miejsca: enklityki po spójnikach (kad sam, dok smo, jer je).
- b1-09 *Nezaboravno putovanje* — wspomnienia i przygody (uspomena, doživjeti, iznenaditi se, slučajno).
- b1-10 *Priča s ljetovanja* — konsolidacja: spójna relacja z przeszłości.

**Moduł 03 `Želje i vikend planovi`** — pełny kondicional I
- b1-11 *Htio bih, volio bih…* — rozgrzewka z a2-07 / a2-24 (htio bih) → volio / voljela bih.
- b1-12 *Mogli bismo zajedno!* — pełna odmiana: bih, bi, bismo, biste, bi (propozycje).
- b1-13 *Kad bih imao više vremena* — warunek potencjalny (kad bih / da imam…) vs realny `ako` z a2-08.
- b1-14 *Što bi ti napravio?* — hipotetyczne decyzje (na tvom mjestu, radije bih).
- b1-15 *Planiranje savršenog vikenda* — konsolidacja: negocjowanie wspólnych planów.

**Moduł 04 `Zdravlje, forma i savjeti`** — zakazy z `nemoj` i rady
- b1-16 *Kako se osjećaš danas?* — rozgrzewka z a2-11 (boli me) → nowe objawy (vrtoglavica, prehlada, alergija, iscrpljen).
- b1-17 *Nemoj čekati!* — rozwinięcie a2-12: nemoj / nemojte + bezokolicznik.
- b1-18 *Trebao bi se odmoriti* — rady: trebao / trebala bi, bilo bi dobro da…
- b1-19 *Zdrav život i stres* — styl życia (prehrana, kretanje, spavanje, izbjegavati).
- b1-20 *Savjet prijatelju* — konsolidacja: rozmowa o zdrowiu i zaleceniach.

### Faza 2: Życie codzienne w nowym wymiarze (b1-21 – b1-40)

**Moduł 05 `Uspoređivanje: Gdje je bolje?`** — porównania zaawansowane i `što… to…`
- b1-21 *Veći, ljepši, mirniji* — rozgrzewka z a2-14 / a2-23 → stopień wyższy z jotacją (tih – tiši, svijetao – svjetliji, čist – čišći) i przysłówki (brže, lakše).
- b1-22 *Što više, to bolje!* — `što` + stopień wyższy…, `to` + stopień wyższy (im…, tym…).
- b1-23 *Daleko najbolji izbor* — stopień najwyższy (a2-32) + wzmocnienia (puno bolji, znatno skuplji, malo manji).
- b1-24 *Grad ili selo, sjever ili jug?* — porównywanie życia w regionach Chorwacji.
- b1-25 *Biranje najbolje opcije* — konsolidacja: wspólny wybór oferty.

**Moduł 06 `Na putu: Trajekt, autocesta i smještaj`** — czasowniki ruchu z przedrostkami
- b1-26 *Kamo idemo?* — rozgrzewka: gdje / kamo / kuda + ići, doći, otići.
- b1-27 *Ući, izaći, prijeći, proći* — przedrostki w mieście i w porcie (ući na trajekt, izaći na stanici, prijeći cestu).
- b1-28 *Na autocesti i u luci* — słownictwo drogowe i promowe (cestarina, gužva, paluba, kašnjenje, skrenuti).
- b1-29 *Stigli smo na vrijeme* — pary aspektowe ruchu (dolaziti / doći, izlaziti / izaći, ulaziti / ući).
- b1-30 *Putovanje na otok* — konsolidacja: relacja z trasy i przesiadek.

**Moduł 07 `Stanovanje i dogovor s vlasnikom`** — dopełniacz liczby mnogiej
- b1-31 *Tražim stan* — rozgrzewka z a2-27 (stanarina, režije) → umowa (polog, ugovor, stanar, vlasnik stana; najmoprimac / najmodavac tylko do rozpoznania w umowie).
- b1-32 *Koliko soba, koliko utičnica?* — dopełniacz lm. po liczebnikach, `nema`, `mnogo / nekoliko` (końcówki -a, -i).
- b1-33 *Sitni kvarovi u stanu* — rozwinięcie a2-29: zgłoszenie usterki (curi voda, ne radi grijanje, poslati majstora).
- b1-34 *Uređenje i namještaj* — czego brakuje i co trzeba (nedostaje, promijeniti, popraviti).
- b1-35 *Razgovor s vlasnikom stana* — konsolidacja: telefon do właściciela.

**Moduł 08 `Online kupovina i reklamacije`** — zdania celowe z `da` i `kako bih`
- b1-36 *Narudžba preko interneta* — rozgrzewka z a2-24 / a2-31 → e-commerce (naručiti, košarica, dostava, pratiti pošiljku, plaćanje pouzećem).
- b1-37 *Zovem da provjerim…* — `da` + czas teraźniejszy (pol. „żeby” + bezokolicznik).
- b1-38 *Kako bih vratio proizvod…* — `kako bih / kako bismo` w kontakcie z obsługą klienta.
- b1-39 *Oštećen paket i garancija* — problemy z zamówieniem (oštećen, pogrešan broj, garancija aktywnie, jamstvo biernie, povrat novca).
- b1-40 *Rješavanje reklamacije* — konsolidacja: pełny proces reklamacji online.

### Faza 3: Praca, relacje, media i egzamin B1 (b1-41 – b1-60)

**Moduł 09 `Posao, projekti i tim`** — celownik, miejscownik, narzędnik lm. (-ima / -ama)
- b1-41 *S kolegom ili s kolegama?* — rozgrzewka z a2-16 (narzędnik lp.) → narzędnik lm. (s kolegama, s klijentima).
- b1-42 *Na sastancima i u tvrtkama* — D / L / I lm. jedną końcówką (-ima / -ama; przymiotniki -im / -ima).
- b1-43 *Razgovor za posao* — rekrutacja (životopis, natječaj, radno iskustvo, vještine, uvjeti).
- b1-44 *Rad od kuće i u uredu* — organizacja pracy (rok, zadatak, odjel, prekovremeno, dati otkaz).
- b1-45 *Na poslovnom sastanku* — konsolidacja: rozmowa w zespole.

**Moduł 10 `Ljudi, karakter i odnosi`** — `koji` oraz zaimki zwrotne i wzajemne
- b1-46 *Kakav je on čovjek?* — cechy charakteru (iskren, pouzdan, strpljiv, tvrdoglav, ponosan) + fałszywi przyjaciele: vrijedan (pracowity ≠ wredny), drag (kochany ≠ drogi = skup).
- b1-47 *Prijatelj koji mi pomaže* — koji / koja / koje w mianowniku i bierniku (film koji gledam vs prijatelj kojeg poznajem).
- b1-48 *Osoba s kojom razgovaram* — koji z przyimkami (s kojim, u kojem, o kojoj).
- b1-49 *Brinuti se o sebi i pomagati jedan drugome* — sebe / sebi / sobom; jedan drugoga / jedno drugo.
- b1-50 *Međuljudski odnosi* — konsolidacja: opis bliskich osób i relacji.

**Moduł 11 `Mediji, kultura i događaji`** — mowa zależna i strona bierna
- b1-51 *Što ima novo u vijestima?* — media i wydarzenia (vijest, članak, objaviti, društvene mreže, događaj).
- b1-52 *Rekao je da će doći* — mowa zależna: czas zostaje jak w zdaniu wyjściowym (jak po polsku).
- b1-53 *Pitao me jesam li slobodan* — pytania zależne (je li / jesam li…, gdje, kada, zašto).
- b1-54 *Film je snimljen u Dubrovniku* — imiesłów bierny -n / -en / -t (napisan, otvoren, izgrađen) i forma z `se` (govori se).
- b1-55 *Kulturni vodič* — konsolidacja: relacjonowanie wiadomości i wydarzeń.

**Moduł 12 `Što ti misliš? Argumenti i pogled u budućnost`** — spójniki złożone, futur II, finał B1
- b1-56 *Iako je teško, vrijedi!* — rozgrzewka z a2-37 (mislim da, slažem se) → iako, međutim, zato što.
- b1-57 *Kad budem imao vremena…* — futur II (budem, budeš, bude + imiesłów) po kad / ako / čim o przyszłości.
- b1-58 *Razgovor i debata* — rozmowa B1: argumentacja, warunki i plany (lekcja specjalna: conversation).
- b1-59 *Veliko ponavljanje B1* — Wielka powtórka modułów 01–12 (spiral).
- b1-60 *Završni ispit B1* — test końcowy B1 (test).

## Audyt słownictwa (dataset `public/data/chorwacki_2000_PL-HR.csv`, ranga)

W zakresie 1–3000: prestati 358, slučajno 1403, doživjeti 2167, radije 885, prehlada 915, alergija 1128, izbjegavati 2031,
tih 380, svijetao 381, čist 133, trajekt 489, cestarina 1247, gužva 1265, kašnjenje 563, skrenuti 1250, ući 1258, proći 2062,
polog 1647, ugovor 469, utičnica 1823, nedostajati 675, dostava 1583, pratiti pošiljku 1587, oštećen 1581, povrat novca 1874,
iskustvo 522, rok 705, zadatak 519, otkaz 1649, prekovremeni rad 1347, iskren 995, pouzdan 1286, strpljiv 1362,
tvrdoglav 1364, ponosan 1366, vijest 1592, članak 1593, objaviti 1598, događaj 1044, izgraditi 2099, iako 870, garancija 1300.

Poza 1–3000 lub brak w datasecie — do decyzji przy pisaniu modułu:
- **Druga połowa par aspektowych** (popiti, pojesti, pročitati, početi, izaći, prijeći, snimiti) — dopuszczalne (zasada wyżej).
- **Słowa tematyczne spoza datasetu:** uspomena, naviknuti se, iscrpljen, kretanje, paluba, majstor, košarica, pouzeće,
  životopis, natječaj, vještina, odjel, međutim — przydatne na B1; wejdą jako słowa lekcji, z wpisem do datasetu przy okazji.
- **Urzędowe (decyzja):** najmoprimac, najmodavac — tylko biernie w umowie; aktywnie `stanar` i `vlasnik stana` (vlasnik 1079).
- **Jamstvo vs garancija (decyzja):** `garancija` (1300) aktywnie, `jamstvo` (3499) biernie.
- **vrtoglavica** (3996), **iznenaditi** (4660), **curiti** (4544) — powyżej 3000, ale naturalne w temacie; zostają jako słowa lekcji.

## Uwagi merytoryczne

- **b1-46, fałszywi przyjaciele (decyzja):** `ponosan` (dumny) zostaje jako zwykła cecha — nie jest fałszywym przyjacielem.
  Fałszywi przyjaciele: `vrijedan` (pracowity / cenny ≠ wredny), `drag` (kochany, miły ≠ drogi = skup). Dataset ma pola
  `FalseFriend` / `FalseFriendNote` — warto je wykorzystać.
- **b1-21:** w jotacji uwaga na `svijetao → svjetliji` (ije → je) i `tih → tiši`, `čist → čišći`; to nowość względem a2-23.
- **b1-42:** końcówka D / L / I lm. to -ima (r. m. i n.) oraz -ama (r. ż.); przymiotniki -im / -ima — jedna tabela na trzy przypadki.
- **b1-57:** futur II występuje praktycznie tylko po kad / ako / čim / dok; w zdaniu głównym zostaje futur I (Kad budem imao vremena, nazvat ću te).

Treść jest autorska i **wymaga przeglądu native speakera**, tak jak A1 i A2.
