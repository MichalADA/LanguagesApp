# Sentence games

The Croatian course uses one dataset: `frontend/public/data/hr_sentences.csv`.
It contains 60 original records, 20 each for A1, A2 and B1. Every record supports
translation, builder, gap, correction and transform exercises.

Routes follow the existing game registry:

- `/gry/sentence-translation`
- `/gry/sentence-builder`
- `/gry/sentence-gap`
- `/gry/sentence-correction`
- `/gry/sentence-transform`

The category is `/gry/kategoria/sentences`. The existing PoolPicker uses the
central level configuration with sentence counts and no vocabulary review filters.
Sentence selection matches the selected level exactly; cumulative vocabulary
selection remains unchanged.

## Data maintenance

The CSV is UTF-8 with a semicolon delimiter and the header defined in
`src/sentences/loader.ts`. Use `|` for acceptedAnswers and gameTypes lists.
Keep IDs stable. Supply one `___` placeholder for gap exercises, an actually
incorrect Croatian sentence for correction, and a complete target sentence for
transforms. A change of person alone is not a grammatical error when the subject
is implicit. Correction explanations and transformation instructions are i18n
keys with translations in both PL and EN.

Current provenance is `sourceType=own`, `sourceName=Lexodromia`, with no external
source URL. `LicenseRef-Lexodromia-own` identifies original project material;
it does not claim an external or third-party open license. These authored
exercises have not received independent native-speaker certification.

When expanding the dataset, maintain at least 10 valid unique records for every
level and game type. The loader rejects malformed rows and inconsistent exercise
fields. Failed downloads can be retried and are not cached permanently.

## Shared implementation

`src/sentences/` owns loading, validation, token handling, queue construction,
and a single session/result component. Sessions sample 10 unique records.
Answer matching preserves Croatian diacritics, words and grammar; it ignores
case, excess whitespace and one final period. Only explicitly listed alternative
answers are accepted. Builder tokens have unique IDs, including repeated words
and punctuation.

The existing LearningSession hook records authenticated sessions and answers,
using `sentence:<mode>:<id>` references. Vocabulary tracking is disabled for
these sessions so sentence answers do not enter flashcard progress. Guests use
local session state. No backend code or sentence SRS was added.

## Verification

Run in `frontend/`:

```sh
npm test
npm run typecheck
npm run build
```

Sentence tests validate the dataset, strict answers, repeated tokens, load errors,
undersized pools, and full ten-question sessions for all 15 mode/level combinations,
including repeated submit/next events and replay.
