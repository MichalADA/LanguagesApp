#!/usr/bin/env python3
"""Generate Croatian audio for Lexodromia from a manifest (listening dialogues or course lessons).

Two manifest formats; the default provider is edge-tts (hr-HR neural voices, no account or billing):
  * listening dialogues: frontend/public/data/listening/hr-*-dialogues.json (default)
  * course audio:        frontend/curriculum/hr-a1/audio-manifest.json (--course-manifest),
    written by `npm run curriculum:a1` from the lesson content of the modules listed in audio.json.
Existing files are never regenerated unless --force is given.

A course manifest may instead declare `"provider": "elevenlabs"` (paid, uses credits): each item's `voice`
is then an ElevenLabs voice_id and `rate` maps to the voice speed. It needs the ELEVENLABS_API_KEY
environment variable and the explicit --allow-paid flag, so a paid run never starts by accident.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path


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
    parser.add_argument("--jobs", type=int, default=3, help="Concurrent TTS requests, 1-5")
    parser.add_argument(
        "--course-manifest",
        type=Path,
        help="Course audio manifest (frontend/curriculum/hr-a1/audio-manifest.json) instead of a dialogue manifest",
    )
    parser.add_argument("--dry-run", action="store_true", help="Only report what would be generated; no TTS requests")
    parser.add_argument(
        "--allow-paid",
        action="store_true",
        help="Required for a manifest with a paid provider (elevenlabs); spends account credits",
    )
    args = parser.parse_args()
    if not 1 <= args.jobs <= 5:
        parser.error("--jobs must be between 1 and 5")
    return args


ALLOWED_PREFIXES = ("/audio/listening/", "/audio/hr/")
SUPPORTED_PROVIDER = "edge-tts"
PAID_PROVIDER = "elevenlabs"
ELEVENLABS_DEFAULT_MODEL = "eleven_multilingual_v2"
ELEVENLABS_URL = "https://api.elevenlabs.io/v1"


def output_path(public_dir: Path, audio_path: str) -> Path:
    if not audio_path.startswith(ALLOWED_PREFIXES) or not audio_path.endswith(".mp3"):
        raise ValueError(f"Unsafe or unsupported audioPath: {audio_path!r}")
    candidate = (public_dir / audio_path.lstrip("/")).resolve()
    public_root = public_dir.resolve()
    if public_root not in candidate.parents:
        raise ValueError(f"audioPath escapes the public directory: {audio_path!r}")
    return candidate


def course_jobs(args: argparse.Namespace) -> tuple[list[tuple[str, str, Path, str | None, str | None]], int, int, str]:
    """(pending, found, existing, rate) for a course audio manifest."""
    payload = json.loads(args.course_manifest.read_text(encoding="utf-8"))
    provider = payload.get("provider")
    if provider not in (SUPPORTED_PROVIDER, PAID_PROVIDER):
        raise SystemExit(f"Unsupported provider {provider!r}; use {SUPPORTED_PROVIDER} or {PAID_PROVIDER}.")
    pending = []
    existing = 0
    for item in payload["items"]:
        target = output_path(args.public_dir, item["audioPath"])
        if target.exists() and not args.force:
            existing += 1
            continue
        # Opcjonalnie per wypowiedź (np. postacie Stories): własne tempo i wysokość głosu.
        pending.append((item["text"], item["voice"], target, item.get("rate"), item.get("pitch")))
    return pending, len(payload["items"]), existing, payload.get("rate", args.rate)


def rate_to_speed(rate: str) -> float:
    """edge-tts rate ("-8%") → ElevenLabs voice speed (0.92), clamped to the API range 0.7–1.2."""
    percent = float(rate.strip().rstrip("%") or 0)
    return round(min(1.2, max(0.7, 1 + percent / 100)), 2)


def elevenlabs_request(path: str, api_key: str, body: dict | None = None) -> bytes:
    request = urllib.request.Request(
        f"{ELEVENLABS_URL}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg, application/json"},
        method="POST" if body is not None else "GET",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def elevenlabs_credits(api_key: str) -> str:
    """Remaining credits, if the key may read the subscription (otherwise just a note)."""
    try:
        info = json.loads(elevenlabs_request("/user/subscription", api_key))
        return f"{info['character_limit'] - info['character_count']} credits left of {info['character_limit']}"
    except Exception as error:  # noqa: BLE001 — informational only
        return f"credit balance unavailable ({type(error).__name__})"


def elevenlabs_synthesize(api_key: str, model: str, text: str, voice_id: str, speed: float) -> bytes:
    """One TTS call. Retries only on 429/5xx (not billed); any other error is reported, never retried."""
    body = {
        "text": text,
        "model_id": model,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True, "speed": speed},
    }
    path = f"/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    for attempt in range(5):
        try:
            return elevenlabs_request(path, api_key, body)
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors="replace")[:300]
            if error.code in (429, 500, 502, 503, 504) and attempt < 4:
                time.sleep(2 ** (attempt + 1))
                continue
            raise RuntimeError(f"HTTP {error.code}: {detail}") from None
    raise RuntimeError("unreachable")


async def synthesize_elevenlabs(
    args: argparse.Namespace, pending: list[tuple[str, str, Path, str | None, str | None]], rate: str, model: str
) -> list[str]:
    api_key = os.environ["ELEVENLABS_API_KEY"]
    semaphore = asyncio.Semaphore(args.jobs)
    errors: list[str] = []

    async def generate_one(text: str, voice: str, target: Path, item_rate: str | None, _pitch: str | None) -> None:
        async with semaphore:
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(".tmp.mp3")
            try:
                audio = await asyncio.to_thread(elevenlabs_synthesize, api_key, model, text, voice, rate_to_speed(item_rate or rate))
                temporary.write_bytes(audio)
                temporary.replace(target)
                print(f"generated {target.relative_to(args.public_dir)}")
            except Exception as error:  # noqa: BLE001 — report every failure, keep the rest
                errors.append(f"{target.relative_to(args.public_dir)}: {error}")
            finally:
                temporary.unlink(missing_ok=True)

    await asyncio.gather(*(generate_one(*item) for item in pending))
    return errors


async def synthesize(args: argparse.Namespace, pending: list[tuple[str, str, Path, str | None, str | None]], rate: str) -> list[str]:
    """Generate pending clips; returns error messages (other clips keep going)."""
    import edge_tts  # dopiero tutaj: --dry-run działa bez instalowania pakietu

    semaphore = asyncio.Semaphore(args.jobs)
    errors: list[str] = []

    async def generate_one(text: str, voice: str, target: Path, item_rate: str | None, pitch: str | None) -> None:
        async with semaphore:
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(".tmp.mp3")
            try:
                await edge_tts.Communicate(text, voice, rate=item_rate or rate, pitch=pitch or "+0Hz").save(temporary)
                temporary.replace(target)
                print(f"generated {target.relative_to(args.public_dir)}")
            except Exception as error:  # noqa: BLE001 — report every failure, keep the rest
                errors.append(f"{target.relative_to(args.public_dir)}: {type(error).__name__}: {error}")
            finally:
                temporary.unlink(missing_ok=True)

    await asyncio.gather(*(generate_one(*item) for item in pending))
    return errors


async def generate_course(args: argparse.Namespace) -> None:
    pending, found, existing, rate = course_jobs(args)
    characters = sum(len(item[0]) for item in pending)
    payload = json.loads(args.course_manifest.read_text(encoding="utf-8"))
    paid = payload["provider"] == PAID_PROVIDER
    model = payload.get("model", ELEVENLABS_DEFAULT_MODEL)
    if paid:
        # Flash/Turbo kosztują ok. 0,5 kredytu za znak, pozostałe modele ok. 1.
        factor = 0.5 if ("flash" in model or "turbo" in model) else 1.0
        api_key = os.environ.get("ELEVENLABS_API_KEY")
        balance = elevenlabs_credits(api_key) if api_key else "ELEVENLABS_API_KEY not set"
        print(f"Provider: {PAID_PROVIDER} (PAID) · model {model} · rate {rate} · {balance}")
    else:
        print(f"Provider: {SUPPORTED_PROVIDER} (no account, no billing) · rate {rate}")
    print(f"Found {found} texts · {existing} recordings exist · {len(pending)} to generate ({characters} characters)")
    if paid:
        print(f"Estimated cost: ~{round(characters * factor)} credits")
    if args.dry_run or not pending:
        return
    if paid:
        if not args.allow_paid:
            raise SystemExit("This manifest uses a paid provider; re-run with --allow-paid to spend credits.")
        if not os.environ.get("ELEVENLABS_API_KEY"):
            raise SystemExit("ELEVENLABS_API_KEY is not set.")
        errors = await synthesize_elevenlabs(args, pending, rate, model)
    else:
        errors = await synthesize(args, pending, rate)
    print(f"Done: found {found}, existing {existing}, new {len(pending) - len(errors)}, errors {len(errors)}")
    for message in errors:
        print(f"  error: {message}")
    if errors:
        raise SystemExit(1)


async def generate_stories(args: argparse.Namespace, payload: dict) -> None:
    """Listening stories (hr-*-stories.json): narrator + characters, ElevenLabs voices per speaker."""
    meta = payload["generatedWith"]
    if meta.get("provider") != PAID_PROVIDER:
        raise SystemExit(f"Stories manifest must use {PAID_PROVIDER}.")
    voices, model, rate = meta["voices"], meta.get("model", ELEVENLABS_DEFAULT_MODEL), meta.get("rate", "+0%")
    stories = payload["stories"]
    if args.dialogue:
        stories = [item for item in stories if item["id"] == args.dialogue]
        if not stories:
            raise SystemExit(f"Unknown story id: {args.dialogue}")
    pending, found, existing = [], 0, 0
    for story in stories:
        for line in story["lines"]:
            found += 1
            voice = voices.get(line["speaker"])
            if not voice:
                raise ValueError(f"No voice configured for speaker {line['speaker']!r}")
            target = output_path(args.public_dir, line["audioPath"])
            if target.exists() and not args.force:
                existing += 1
                continue
            pending.append((line["textHr"], voice, target, None, None))
    characters = sum(len(item[0]) for item in pending)
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    balance = elevenlabs_credits(api_key) if api_key else "ELEVENLABS_API_KEY not set"
    print(f"Provider: {PAID_PROVIDER} (PAID) · model {model} · rate {rate} · {balance}")
    print(f"Found {found} lines · {existing} recordings exist · {len(pending)} to generate ({characters} characters)")
    print(f"Estimated cost: ~{characters} credits")
    if args.dry_run or not pending:
        return
    if not args.allow_paid:
        raise SystemExit("This manifest uses a paid provider; re-run with --allow-paid to spend credits.")
    if not api_key:
        raise SystemExit("ELEVENLABS_API_KEY is not set.")
    errors = await synthesize_elevenlabs(args, pending, rate, model)
    print(f"Done: found {found}, existing {existing}, new {len(pending) - len(errors)}, errors {len(errors)}")
    for message in errors:
        print(f"  error: {message}")
    if errors:
        raise SystemExit(1)


async def generate(args: argparse.Namespace) -> None:
    if args.course_manifest:
        await generate_course(args)
        return
    payload = json.loads(args.manifest.read_text(encoding="utf-8"))
    if "stories" in payload:
        await generate_stories(args, payload)
        return
    voices = payload["generatedWith"]["voices"]
    dialogues = payload["dialogues"]
    if args.dialogue:
        dialogues = [item for item in dialogues if item["id"] == args.dialogue]
        if not dialogues:
            raise SystemExit(f"Unknown dialogue id: {args.dialogue}")

    pending = []
    skipped = 0
    for dialogue in dialogues:
        for line in dialogue["lines"]:
            voice = voices.get(line["speaker"])
            if not voice:
                raise ValueError(f"No voice configured for speaker {line['speaker']!r}")
            target = output_path(args.public_dir, line["audioPath"])
            if target.exists() and not args.force:
                skipped += 1
                continue
            pending.append((line["textHr"], voice, target))

    import edge_tts

    semaphore = asyncio.Semaphore(args.jobs)

    async def generate_one(text: str, voice: str, target: Path) -> None:
        async with semaphore:
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(".tmp.mp3")
            try:
                await edge_tts.Communicate(text, voice, rate=args.rate).save(temporary)
                temporary.replace(target)
            finally:
                temporary.unlink(missing_ok=True)
            print(f"generated {target.relative_to(args.public_dir)}")

    await asyncio.gather(*(generate_one(*item) for item in pending))

    print(f"Done: {len(pending)} generated, {skipped} already present")


if __name__ == "__main__":
    asyncio.run(generate(parse_args()))
