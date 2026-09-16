"""Rebuild the append-only 3001–5000 supplement using the Python standard library."""
from pathlib import Path
import csv
import hashlib
import io
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'frontend/public/data/chorwacki_2000_PL-HR.csv'
SOURCE = Path(__file__).with_name('expansion-5000.txt')
BASE_SHA256 = '548cb75792a50c2ee5b8550c4e4ae43fbf946a2ebec4e0d1489fbb9430b6d21e'


def normalize(value):
    return ' '.join(re.sub(r'[^\w\s]', '', unicodedata.normalize('NFC', value).lower()).split())


def build():
    original = DATA.read_bytes().splitlines(keepends=True)
    prefix = b''.join(original[:3001])
    if hashlib.sha256(prefix).hexdigest() != BASE_SHA256:
        raise ValueError('Original 3000 cards changed; review the baseline before rebuilding.')
    previous = list(csv.DictReader(io.StringIO(prefix.decode('utf-8-sig')), delimiter=';'))
    seen = {normalize(row['Croatian']) for row in previous}
    variants = {
        'zovem se': ['ja se zovem'],
        'moje ime je': ['ime mi je'],
        'prezivam se': ['ja se prezivam'],
        'njezin': ['njen'],
        'zaimača': ['kutlača', 'šeflja'],
        'štipaljka za nos': ['kopča za nos'],
        'plivačke naočale': ['naočale za plivanje'],
        'prijediplomski studij': ['preddiplomski studij'],
        'karta u jednom smjeru': ['jednosmjerna karta'],
    }
    grammar = {
        'zovem se': '1. osoba liczby pojedynczej od zvati se. Po zwrocie podaj imię.',
        'moje ime je': 'Po zwrocie podaj imię; także: ime mi je.',
        'prezivam se': 'Po zwrocie podaj nazwisko.',
        'zvati se': 'Czasownik zwrotny; ja se zovem = nazywam się.',
        'iznajmiti': 'Wynająć komuś; wynająć od kogoś = unajmiti.',
        'ljubiti': 'Tutaj: całować. Kochać = voljeti.',
        'na vi': 'Zwrot grzecznościowy; do jednej osoby formalnie często pisane Vi.',
    }
    stream = io.StringIO(newline='')
    writer = csv.writer(stream, delimiter=';', lineterminator='\n')
    rank = 3000
    for line in SOURCE.read_text().splitlines():
        if not line.strip():
            continue
        if line.startswith('#'):
            pos, topics = line[1:].strip().split('|')
            continue
        hr, pl, example_hr, example_pl = line.split('|')
        if any(not field or field != field.strip() for field in (hr, pl, example_hr, example_pl)):
            raise ValueError(f'Empty or untrimmed field: {line}')
        if normalize(hr) in seen:
            raise ValueError(f'Duplicate target: {hr}')
        seen.add(normalize(hr))
        rank += 1
        block_start = ((rank - 1) // 500) * 500 + 1
        tags = f'HR_{block_start:04}_{block_start + 499:04} {pos} {topics} uzupełnienie'
        accepted = list(variants.get(hr, []))
        if pos == 'phrase':
            plain = hr.replace(',', '')
            punctuation = '?' if example_hr.endswith('?') else '.'
            # Sentences typed with their usual punctuation are valid too.
            accepted += [hr + punctuation, plain, plain + punctuation]
            accepted += [answer + punctuation for answer in variants.get(hr, [])]
        unique = []
        used = {hr.casefold()}
        for answer in accepted:
            if answer.casefold() not in used:
                used.add(answer.casefold())
                unique.append(answer)
        writer.writerow([rank, pl, hr, pos, grammar.get(hr, ''), example_hr,
                         example_pl, 'NO', '', tags,
                         json.dumps(unique, ensure_ascii=False)])
    if rank != 5000:
        raise ValueError(f'Expected 5000 cards; got {rank}')
    DATA.write_bytes(prefix + stream.getvalue().encode('utf-8'))
    print('5000 cards; first 3000 records preserved byte for byte.')


if __name__ == '__main__':
    build()
