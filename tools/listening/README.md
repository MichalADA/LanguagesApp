# Croatian FLEURS listening pilot

This is an **offline sample exporter**, not a deployed listening feature. It does not touch Prisma, production data, the frontend, or the existing Tako Lako importer.

## Run

From the repository root, using Python 3.10+:

```bash
python -m pip install 'datasets>=3,<5' pyarrow
python tools/listening/import_fleurs_sample.py --limit 30
```

The exporter streams the `google/fleurs` `hr_hr` **validation** split, retains encoded audio bytes, selects unique transcripts of at most 30 whitespace-delimited words, and writes `data/listening/fleurs-hr-sample/manifest.json` plus individual audio files. Try `--limit 10` for a smaller first pass or `--max-words 20` for shorter transcripts. Streaming avoids fetching the entire 3+ GB Croatian set, but it **still downloads data** and may read more bytes than the final sample size.

Each manifest row includes a stable dataset ID, Croatian transcript, local audio path, source, license, and blank `level` and `translationPl` fields. These blanks are deliberate: FLEURS does not supply Polish translations, CEFR levels, or comprehension questions. Review manually before classifying or publishing. This dataset contains individual utterances from a translation benchmark, not conversational lessons.

## Publication / attribution

Dataset: https://huggingface.co/datasets/google/fleurs (CC BY 4.0). Retain source attribution, link to license, cite the dataset as requested by its card, and note any edits/transcoding. Check the dataset card and audio quality before distributing clips. Review potential third-party rights and don't assume a machine-generated Polish translation is accurate.

## Next phase (not implemented)

Manually review 20-30 clips, check whether the source provides playable audio and intelligible Croatian, then add a dedicated listening content model and serve only reviewed clips. Do not add all samples or expose this utility as a public HTTP endpoint.
