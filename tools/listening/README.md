# Croatian TTS listening pilot

The source of truth is `frontend/public/data/listening/hr-a1-dialogues.json`. It contains short,
levelled dialogues, Polish translations, comprehension questions, voice assignments and final public
audio paths. The generated MP3 files are build assets; TTS is never called from the browser.

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
```

Use `--dialogue a1-kafic` to regenerate one dialogue or `--force` to replace existing files. The
default rate is `-8%`; pass `--rate +0%` for normal speed.

The pilot uses the Croatian `hr-HR-GabrijelaNeural` and `hr-HR-SreckoNeural` online voices through
the community `edge-tts` package. That endpoint is suitable for testing, but it is not a production
SLA. Keep the manifest/provider boundary so a supported TTS service can replace it later.
