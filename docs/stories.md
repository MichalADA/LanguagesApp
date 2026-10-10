# Lexodromia Stories

Gra fabularna: gracz podróżuje po Chorwacji, rozmawia z postaciami i wykonuje misje po chorwacku.
Każdy poziom CEFR to osobne miasto (A1 Split — grywalny, A2 Zagreb i B1 Dubrovnik — zapowiedziane).
Bez AI: dialogi są napisane wcześniej, a odpowiedzi sprawdzane deterministycznie.

## Trasy

| Trasa | Ekran |
| --- | --- |
| `/stories` | wybór miasta (wpis „Stories” w sekcji Gry) |
| `/stories/split-a1` | mapa miasta jako hub: lokacje, postacie, misje, odblokowania |
| `/stories/split-a1/m3-coffee` | misja w trybie skupienia: odprawa → scena → podsumowanie |

## Architektura (`frontend/src/stories/`)

```
types.ts        model: Story → StoryLocation / Npc / Mission → DialogueSpec (graf węzłów)
engine.ts       czysty silnik grafu (startRun / answer / proceed), warunki i efekty na flagach,
                DialogueDriver — interfejs prowadzenia rozmowy (dziś scriptedDriver)
validate.ts     walidacja historii i grafów (uruchamiana w testach)
progress.ts     statusy misji i lokacji, nagroda tylko za pierwsze ukończenie
repository.ts   zapis: gość → localStorage, konto → backend z kolejką (eventId)
integration.ts  nagrania kursu, FSRS (/reviews/answer), kolejka nowych kart (/reviews/enroll)
art/            ilustracje SVG + rejestr assetów (registry.tsx)
data/           treść: data/index.ts (miasta), data/split-a1/{story,missions,audio}.ts
pages/, components/  hub, mapa miasta, misja, scena visual novel
```

Węzły dialogu: `say` (wypowiedź), `choice` (wybór; opcje `correct` / `wrong` z wyjaśnieniem /
`neutral`, np. „Ne razumijem.”; `when` — opcja warunkowa), `build` (ułóż zdanie z kafelków, mogą być
mylące kafelki), `type` (wpisz; warianty + opcjonalna rama RegExp), `branch`, `event`, `end`.
Błędna odpowiedź może uruchomić reakcję postaci (`next` opcji / `onWrong`), ale nigdy nie blokuje:
po dwóch nieudanych próbach pokazujemy odpowiedź i rozmowa idzie dalej.

Dydaktyka: w misji rozpoznanie (wybór) → układanie → samodzielne wpisanie. Tłumaczenie jest ukryte
i odsłaniane na żądanie (klawisz T); odsłonięte przy zadaniu liczy się jako podpowiedź.

## Postęp i nagrody

Backend: `GET /stories/:storyId/progress?course=`, `POST /stories/:storyId/missions/:missionId/complete`
(tabele `StoryProgress`, `StoryMissionCompletion`). Pierwsze ukończenie tworzy wiersz i przyznaje XP;
powtórka zwiększa licznik podejść i najlepszy wynik; ten sam `eventId` (ponowienie po błędzie sieci) nic
nie zmienia. Gość: ta sama logika lokalnie (`progress.ts → completeMission`).

## FSRS — bez równoległego systemu powtórek

- Słownictwo misji (`mission.vocabulary`) ma te same karty co lekcje kursu (`WORD pl-hr:<rank>` /
  `PHRASE pl-hr:phrase:<tekst>`); test porównuje je z danymi generatora kursu.
- Po misji słowa trafiają jako NOWE karty do istniejącej kolejki (`curriculum/srs.ts`, idempotentnie).
- Ocenę FSRS dostaje tylko zadanie produkcyjne ze wskazanym słowem (`practice`), tylko pierwsza próba
  i tylko zanim misja zostanie ukończona — powtórka misji to trening bez wpływu na FSRS i XP.
  Kafelki = `stories-builder` (FSRS: trudne), wpisanie = `stories-typing`; błąd tylko w diakrytykach
  i odsłonięte tłumaczenie obniżają ocenę do „trudne”.

## Nagrania

`npm run stories:audio` zapisuje `data/<miasto>/audio.ts`: wypowiedź dostaje nagranie kursu tylko przy
dokładnie tym samym tekście i istniejącym pliku; odtwarzacz wybiera głos zgodny z postacią
(`npc.voice`), więc Marko nie mówi głosem lektorki. `npm test` sprawdza aktualność pliku.

## Grafiki

Wszystkie tła, portrety (z mimiką neutral / happy / puzzled) i mapa to własne ilustracje SVG —
placeholdery produkcyjne. Podmiana na docelowe pliki: wpis w `art/registry.tsx`, np.
`kafic: { kind: "image", src: "/stories/split/kafic.webp", alt: "…" }` (plik w `public/stories/…`).

## Nowe miasto / lokacja / misja

1. Lokacja: wpis w `story.locations` (tło z rejestru, pozycja na mapie, `unlock`). Zapowiedziane
   miejsca Splitu (`comingSoon`: port, plaża, dworzec, piekarnia, targ) czekają na misje.
2. Misja: obiekt `Mission` w `data/<miasto>/missions.ts` (graf przez `data/builders.ts`).
3. Miasto: katalog `data/<miasto>/` + wpis w `data/index.ts` (+ manifest nagrań w `scripts/stories-audio.mjs`).
4. `npm run stories:audio`, `npm test` (walidacja zatrzyma błędny scenariusz).

## Przyszłe dialogi AI

`DialogueSpec` ma dziś tylko `{ kind: "scripted" }`. Dialog prowadzony przez model językowy byłby
kolejnym wariantem implementującym `DialogueDriver` (start / answer / proceed na `RunState`).
Misje, cele, flagi świata, nagrody i zapis postępu nie zależą od sposobu prowadzenia rozmowy.

## Weryfikacja językowa

Treść chorwacka opiera się na materiale lekcji A1, ale **nie została sprawdzona przez native speakera**
(`story.languageReview: "unverified"`, informacja widoczna na mapie miasta).
