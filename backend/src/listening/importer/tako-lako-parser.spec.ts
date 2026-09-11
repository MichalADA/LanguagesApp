import {
  extractPressbooksLinks,
  groupLessons,
  parseCatalog,
} from './tako-lako-parser';

const SAMPLE = `
  <a href="https://utexas.pressbooks.pub/takolako/">Home</a>
  <a href="https://utexas.pressbooks.pub/navrh-jezika/">Design</a>

  <a href="https://utexas.pressbooks.pub/takolako/chapter/u1-overview/">Unit 1 overview</a>

  <a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1/">Introducing yourself</a>
  <a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1-grammar/#pronoun">Grammar · pronouns</a>
  <a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1-grammar/#biti">Grammar · biti</a>
  <a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1-vocabulary/">Vocabulary</a>
  <a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1-pronunciation/">Pronunciation</a>

  <a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson2/">Greetings</a>
  <a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson2-grammar/#call">Grammar</a>
  <a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson2-vocabulary/#countries">Vocab · countries</a>
  <a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson2-vocabulary#names">Vocab · names</a>

  <a href="https://utexas.pressbooks.pub/takolako/chapter/u6-m1-lesson2-video/">Video</a>

  <a href="https://utexas.pressbooks.pub/takolako/chapter/u2-m2-lesson2-grammar-2/#verbs">Grammar (revised)</a>

  <a href="https://utexas.pressbooks.pub/takolako/chapter/u10-m3-lesson2-vocabulary/">Vocab</a>

  <a href="/somewhere/else/">Off-site</a>
`;

describe('extractPressbooksLinks', () => {
  it('parses unit, module, lesson and type for a plain lesson URL', () => {
    const [link] = extractPressbooksLinks(
      '<a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1/">x</a>',
    );
    expect(link).toMatchObject({ unit: 1, module: 1, lesson: 1, type: 'main' });
  });

  it('classifies grammar/vocabulary/pronunciation/video', () => {
    const links = extractPressbooksLinks(SAMPLE);
    const types = new Set(links.map((l) => l.type));
    expect(types.has('main')).toBe(true);
    expect(types.has('grammar')).toBe(true);
    expect(types.has('vocabulary')).toBe(true);
    expect(types.has('pronunciation')).toBe(true);
    expect(types.has('video')).toBe(true);
  });

  it('handles two-digit units', () => {
    const [link] = extractPressbooksLinks(
      '<a href="https://utexas.pressbooks.pub/takolako/chapter/u10-m3-lesson2-vocabulary/">x</a>',
    );
    expect(link).toMatchObject({ unit: 10, module: 3, lesson: 2, type: 'vocabulary' });
  });

  it('accepts the suffixed "-grammar-2" variant', () => {
    const [link] = extractPressbooksLinks(
      '<a href="https://utexas.pressbooks.pub/takolako/chapter/u2-m2-lesson2-grammar-2/#verbs">x</a>',
    );
    expect(link).toMatchObject({ unit: 2, module: 2, lesson: 2, type: 'grammar' });
  });

  it('ignores /uN-overview/ chapters', () => {
    const links = extractPressbooksLinks(
      '<a href="https://utexas.pressbooks.pub/takolako/chapter/u1-overview/">x</a>' +
        '<a href="https://utexas.pressbooks.pub/takolako/chapter/u2-overview/">y</a>',
    );
    expect(links).toEqual([]);
  });

  it('drops fragments and deduplicates by base URL (two #anchors, one page)', () => {
    const links = extractPressbooksLinks(
      '<a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1-grammar/#pronoun">a</a>' +
        '<a href="https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1-grammar/#biti">b</a>',
    );
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe(
      'https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1-grammar/',
    );
  });

  it('skips off-site and non-chapter anchors', () => {
    const links = extractPressbooksLinks(
      '<a href="https://utexas.pressbooks.pub/takolako/">home</a>' +
        '<a href="/somewhere/else/">off</a>',
    );
    expect(links).toEqual([]);
  });
});

describe('groupLessons', () => {
  it('collapses grammar / vocabulary / pronunciation into the same lesson record', () => {
    const grouped = parseCatalog(SAMPLE);
    const u1m1l1 = grouped.find((g) => g.key === 'u1-m1-lesson1');
    expect(u1m1l1).toBeDefined();
    expect(u1m1l1?.lessonUrl).toBe(
      'https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1/',
    );
    expect(u1m1l1?.grammarUrl).toBe(
      'https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1-grammar/',
    );
    expect(u1m1l1?.vocabularyUrl).toBe(
      'https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1-vocabulary/',
    );
    expect(u1m1l1?.pronunciationUrl).toBe(
      'https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1-pronunciation/',
    );
    expect(u1m1l1?.videoUrl).toBeNull();
  });

  it('assigns videoUrl only when a -video chapter is present', () => {
    const grouped = parseCatalog(SAMPLE);
    const u6m1l2 = grouped.find((g) => g.key === 'u6-m1-lesson2');
    expect(u6m1l2?.videoUrl).toBe(
      'https://utexas.pressbooks.pub/takolako/chapter/u6-m1-lesson2-video/',
    );
    // No main lesson URL was linked for u6-m1-lesson2 in the sample — it should stay null.
    expect(u6m1l2?.lessonUrl).toBeNull();
  });

  it('uses anchor text as title when available, falls back otherwise', () => {
    const grouped = parseCatalog(SAMPLE);
    expect(grouped.find((g) => g.key === 'u1-m1-lesson1')?.title).toBe('Introducing yourself');
    // u6-m1-lesson2 has no main link → falls back to "Unit N · Module M · Lesson L".
    expect(grouped.find((g) => g.key === 'u6-m1-lesson2')?.title).toBe(
      'Unit 6 · Module 1 · Lesson 2',
    );
  });

  it('sorts by (unit, module, lesson)', () => {
    const grouped = parseCatalog(SAMPLE);
    const keys = grouped.map((g) => g.key);
    expect(keys).toEqual([
      'u1-m1-lesson1',
      'u1-m1-lesson2',
      'u2-m2-lesson2',
      'u6-m1-lesson2',
      'u10-m3-lesson2',
    ]);
  });

  it('produces at most one record per (unit, module, lesson)', () => {
    const grouped = parseCatalog(SAMPLE);
    const keys = grouped.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('re-running the parser on the same HTML yields identical records', () => {
    expect(parseCatalog(SAMPLE)).toEqual(parseCatalog(SAMPLE));
  });
});
