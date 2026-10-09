# Kurs chorwackiego A2 — źródła treści (moduły 1–4)

Ten sam format i generator co A1 (zob. `curriculum/hr-a1/README.md`), osobny poziom:

```
level.json                          ← poziom: A2, prefiks a2, 4 moduły × 5 lekcji, dziedziczy słownictwo hr-a1
lexodromia_hr_A2_curriculum.csv     ← źródło prawdy: lekcje, słownictwo, zdania, blueprinty
didactics.json                      ← gramatyka, dialogi z ramami odpowiedzi, zadania swobodne
audio.json / audio-manifest.json    ← nagrania w /audio/hr/a2/module-XX/
        │
        ▼  npm run curriculum:a2   (scripts/generate-curriculum.mjs --level hr-a2)
src/curriculum/data/hr-a2/          ← wygenerowane TypeScript (commitowane, nie edytuj ręcznie)
```

- **Moduł 1 „Opowiadam o przeszłości”:** perfekt we wszystkich osobach (a2-01), przeczenie nisam / nije + jer (a2-02),
  pytania Jesi li…? i krótkie odpowiedzi Jesam / Nisam (a2-03), historia po kolei: prvo, zatim, na kraju, prije + dopełniacz (a2-04),
  powtórka z rozmową o wakacjach (a2-05).
- **Moduł 2 „Plany i obowiązki”:** czas przyszły we wszystkich osobach i szyk Radit ćemo (a2-06), morati / moći / smjeti
  + bezokolicznik, ne moraš ≠ ne smiješ (a2-07), warunek z ako i ako bude… (a2-08), zaproszenie, odmowa i nowy termin,
  te / ti po ću (a2-09), powtórka z planowaniem tygodnia (a2-10).
- **Moduł 3 „Zdrowie”:** boli me / bole me (a2-11), u lekarza i tryb rozkazujący odmorite se / pijte (a2-12),
  apteka: protiv + dopełniacz, dvaput dnevno (a2-13), stopień wyższy bolje / više / manje + nego (a2-14), powtórka (a2-15).
- **Moduł 4 „Praca i nauka”:** narzędnik po baviti se i s, kao + mianownik (a2-16), rozmowa o pracę: već, od, prije toga (a2-17),
  formalny e-mail i telefon: Poštovani, Molim vas da… (a2-18), nauka języka: sve bolje, Možete li govoriti sporije? (a2-19), powtórka (a2-20).
- Ćwiczenia słuchania używają nagranych dialogów z `public/data/listening/hr-a2-dialogues.json` (wszystkie 10 są już w lekcjach).
- **Odmiana czasowników:** karta każdego nowego czasownika pokazuje czas teraźniejszy, przeszły i przyszły z nagraniem
  (`conjugation` w `scripts/lib/hr-morphology.mjs`); nieregularne formy dopisz w `PRES_OVERRIDES` / `PP_OVERRIDES`.
- **Dziedziczenie A1:** ramy odpowiedzi (`{pp}`, `{acc}`, `{inf}`…) znają formy całego słownictwa A1, a generator ostrzega,
  gdy rdzeń lekcji A2 powtarza słowo, które uczeń zna z A1 (test `tests/curriculum-a2.test.mjs` traktuje to jako błąd).
- **Slot `{pp}`:** imiesłów w każdej osobie i liczbie (radio, radila, radilo, radili, radile) — do zdań z „smo / su / nisu”.
- **Otwarte repliki A2** mają listę naturalnych i błędnych odpowiedzi w `tests/curriculum-a2.test.mjs` (`OPEN_REPLIES`).
- **Kolejny moduł:** dopisz lekcje do CSV i `didactics.json`, zwiększ `modules` w `level.json`, dopisz numer modułu w `audio.json`,
  potem `npm run curriculum:a2` → `python tools/listening/generate_tts.py --course-manifest frontend/curriculum/hr-a2/audio-manifest.json` → `npm run curriculum:a2`.
- Treść jest autorska i **wymaga przeglądu native speakera**, zanim poziom zostanie rozbudowany dalej.
