#!/usr/bin/env python3
"""Export a small, reviewable Croatian FLEURS sample without importing lessons.

Install: python -m pip install 'datasets>=3,<5' pyarrow
Run: python tools/listening/import_fleurs_sample.py --limit 30

Output is local-only; do not commit the generated audio or JSON by accident.
"""

import argparse
import json
import re
from pathlib import Path

from datasets import load_dataset

DATASET = "google/fleurs"
CONFIG = "hr_hr"
LICENSE = "CC BY 4.0"
SOURCE = "https://huggingface.co/datasets/google/fleurs"


def audio_extension(blob: bytes) -> str | None:
    """Determine file format from bytes, not an untrusted input filename."""
    if blob.startswith(b"RIFF") and blob[8:12] == b"WAVE":
        return ".wav"
    if blob.startswith(b"fLaC"):
        return ".flac"
    if blob.startswith(b"OggS"):
        return ".ogg"
    if blob.startswith(b"ID3") or (len(blob) > 1 and blob[0] == 0xFF and blob[1] & 0xE0 == 0xE0):
        return ".mp3"
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=30, help="Number of accepted recordings, 1-100")
    parser.add_argument("--max-words", type=int, default=30, help="Skip longer transcripts")
    parser.add_argument("--split", choices=("train", "validation", "test"), default="validation")
    parser.add_argument("--out", type=Path, default=Path("data/listening/fleurs-hr-sample"))
    args = parser.parse_args()
    if not 1 <= args.limit <= 100 or args.max_words < 1:
        parser.error("--limit must be 1-100 and --max-words must be positive")

    # Streaming prevents downloading the complete multi-gigabyte Croatian dataset.
    dataset = load_dataset(DATASET, CONFIG, split=args.split, streaming=True)
    dataset = dataset.decode(False)  # Retain encoded audio bytes, avoid torchcodec dependency.
    args.out.mkdir(parents=True, exist_ok=True)
    audio_dir = args.out / "audio"
    audio_dir.mkdir(exist_ok=True)
    records = []
    seen = set()
    for example in dataset:
        text = (example.get("raw_transcription") or example.get("transcription") or "").strip()
        if not text or len(re.findall(r"\S+", text)) > args.max_words:
            continue
        if text.casefold() in seen:
            continue
        audio = example.get("audio") or {}
        blob = audio.get("bytes")
        if not isinstance(blob, bytes):
            continue  # Do not assume the dataset exposes a local path in streaming mode.
        ext = audio_extension(blob)
        if ext is None:
            continue
        sample_id = str(example["id"])
        safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", sample_id)
        filename = f"{args.split}-{safe_id}{ext}"
        (audio_dir / filename).write_bytes(blob)
        seen.add(text.casefold())
        records.append({
            "id": f"fleurs:hr_hr:{args.split}:{sample_id}",
            "language": "hr",
            "transcript": text,
            "audioPath": f"audio/{filename}",
            "source": SOURCE,
            "license": LICENSE,
            "attribution": "FLEURS (Google), based on FLORES; see dataset card for citation",
            "split": args.split,
            "reviewed": False,
            "level": None,
            "translationPl": None,
        })
        if len(records) >= args.limit:
            break

    (args.out / "manifest.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Exported {len(records)}/{args.limit} clips to {args.out}")
    if len(records) < args.limit:
        print("Fewer clips met the filters; inspect dataset encoding or raise --max-words.")


if __name__ == "__main__":
    main()
