# Croatian TTS listening pilot

The source files are `frontend/public/data/listening/hr-a1-dialogues.json` and
`frontend/public/data/listening/hr-a2-dialogues.json`. They contain levelled dialogues, Polish
translations, comprehension questions, voice assignments and final public audio paths. The generated
MP3 files are build assets; TTS is never called from the browser.

All dialogue text is original Lexodromia content. `reviewStatus: needs-native-review` is intentional:
do not scale the dataset to A2/B1 or treat the wording and pronunciation as approved until a native
Croatian speaker has reviewed the pilot.

## Generate in a virtual environment

From the repository root in WSL:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r tools/listening/requirements-tts.txt
python tools/listening/generate_tts.py
python tools/listening/generate_tts.py --manifest frontend/public/data/listening/hr-a2-dialogues.json
```

Use `--dialogue a1-kafic` to regenerate one dialogue or `--force` to replace existing files. The
default rate is `-8%`; pass `--rate +0%` for normal speed.

The pilot uses the Croatian `hr-HR-GabrijelaNeural` and `hr-HR-SreckoNeural` online voices through
the community `edge-tts` package. That endpoint is suitable for testing, but it is not a production
SLA. Keep the manifest/provider boundary so a supported TTS service can replace it later.

## Course lesson audio (A1 course, module by module)

The same script and voices generate audio for course lessons. Lesson texts are collected by the
curriculum generator — nothing is listed by hand:

```bash
cd frontend
npm run curriculum:a1                      # writes curriculum/hr-a1/audio-manifest.json for modules in audio.json
cd ..
python tools/listening/generate_tts.py --course-manifest frontend/curriculum/hr-a1/audio-manifest.json --dry-run
python tools/listening/generate_tts.py --course-manifest frontend/curriculum/hr-a1/audio-manifest.json
cd frontend && npm run curriculum:a1       # attaches audioSrc to lessons now that the MP3 files exist
```

`--dry-run` prints the number of texts, existing recordings and characters to synthesize without any
request. Existing files are skipped; the summary lists found / existing / new / errors. The script refuses
any provider other than `edge-tts`, so it can never switch to a paid service by accident.
To add module 2, append `2` to `modules` in `frontend/curriculum/hr-a1/audio.json` and repeat the steps.
Files land in `frontend/public/audio/hr/a1/module-XX/<slug>.mp3`; texts already recorded for an earlier
module are reused, not regenerated.
