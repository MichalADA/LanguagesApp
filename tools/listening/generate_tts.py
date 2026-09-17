#!/usr/bin/env python3
"""Generate Croatian listening clips from Lexodromia's reviewed dialogue manifest."""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT / "frontend/public/data/listening/hr-a1-dialogues.json"
DEFAULT_PUBLIC_DIR = ROOT / "frontend/public"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--public-dir", type=Path, default=DEFAULT_PUBLIC_DIR)
    parser.add_argument("--dialogue", help="Generate only one dialogue id")
    parser.add_argument("--force", action="store_true", help="Replace existing MP3 files")
    parser.add_argument("--rate", default="-8%", help="edge-tts speaking rate, e.g. -8%% or +0%%")
    return parser.parse_args()


def output_path(public_dir: Path, audio_path: str) -> Path:
    if not audio_path.startswith("/audio/listening/") or not audio_path.endswith(".mp3"):
        raise ValueError(f"Unsafe or unsupported audioPath: {audio_path!r}")
    candidate = (public_dir / audio_path.lstrip("/")).resolve()
    public_root = public_dir.resolve()
    if public_root not in candidate.parents:
        raise ValueError(f"audioPath escapes the public directory: {audio_path!r}")
    return candidate


async def generate(args: argparse.Namespace) -> None:
    payload = json.loads(args.manifest.read_text(encoding="utf-8"))
    voices = payload["generatedWith"]["voices"]
    dialogues = payload["dialogues"]
    if args.dialogue:
        dialogues = [item for item in dialogues if item["id"] == args.dialogue]
        if not dialogues:
            raise SystemExit(f"Unknown dialogue id: {args.dialogue}")

    generated = skipped = 0
    for dialogue in dialogues:
        for line in dialogue["lines"]:
            voice = voices.get(line["speaker"])
            if not voice:
                raise ValueError(f"No voice configured for speaker {line['speaker']!r}")
            target = output_path(args.public_dir, line["audioPath"])
            if target.exists() and not args.force:
                skipped += 1
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(".tmp.mp3")
            try:
                await edge_tts.Communicate(line["textHr"], voice, rate=args.rate).save(temporary)
                temporary.replace(target)
            finally:
                temporary.unlink(missing_ok=True)
            generated += 1
            print(f"generated {target.relative_to(args.public_dir)}")

    print(f"Done: {generated} generated, {skipped} already present")


if __name__ == "__main__":
    asyncio.run(generate(parse_args()))
