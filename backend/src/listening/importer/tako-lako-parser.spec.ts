import {
  extractLessonLinks,
  extractLevel,
  extractUnit,
  extractTitle,
  extractAudio,
  extractVideo,
  extractTranscript,
  parseLesson,
} from './tako-lako-parser';

const BASE = 'https://takolako.com';
const INDEX = `${BASE}/lessons`;

describe('extractLessonLinks', () => {
  it('picks lesson anchors and resolves relative URLs', () => {
    const html = `
      <a href="/lessons/pozdravi">Pozdravi</a>
      <a href="https://takolako.com/lessons/predstavljanje">Predstavljanje</a>
      <a href="/about">About</a>
      <a href="/lessons">Index itself</a>
    `;
    const links = extractLessonLinks(html, BASE, INDEX);
    expect(links).toEqual([
      'https://takolako.com/lessons/pozdravi',
      'https://takolako.com/lessons/predstavljanje',
    ]);
  });

  it('deduplicates', () => {
    const html = `<a href="/lessons/x"></a><a href="/lessons/x"></a>`;
    expect(extractLessonLinks(html, BASE, INDEX)).toHaveLength(1);
  });
});

describe('extractLevel / extractUnit / extractTitle', () => {
  it('reads data attributes', () => {
    const html = `<article data-level="Intermediate" data-unit="Slobodno vrijeme" data-unit-position="3">
      <h1>Hobiji</h1></article>`;
    expect(extractLevel(html)).toBe('Intermediate');
    expect(extractUnit(html)).toEqual({ title: 'Slobodno vrijeme', position: 3 });
    expect(extractTitle(html)).toBe('Hobiji');
  });

  it('falls back to metadata and Unit N in title', () => {
    const html = `<meta name="level" content="Beginner"><meta name="unit" content="Unit 2 — Predstavljanje"><title>Zovem se…</title>`;
    expect(extractLevel(html)).toBe('Beginner');
    expect(extractUnit(html)).toEqual({ title: 'Unit 2 — Predstavljanje', position: 2 });
    expect(extractTitle(html)).toBe('Zovem se…');
  });

  it('gives sensible defaults when nothing matches', () => {
    expect(extractLevel('<p>nothing</p>')).toBe('Beginner');
    expect(extractUnit('<p>nothing</p>')).toEqual({ title: 'Unit 1', position: 1 });
    expect(extractTitle('<p>nothing</p>')).toBe('Untitled');
  });
});

describe('extractAudio / extractVideo', () => {
  it('reads <audio src> and resolves relative URLs', () => {
    expect(extractAudio('<audio src="/media/a.mp3"></audio>', BASE)).toBe('https://takolako.com/media/a.mp3');
  });

  it('reads <source> mp3 fallback', () => {
    expect(extractAudio('<audio><source src="https://cdn/a.mp3"></audio>', BASE)).toBe('https://cdn/a.mp3');
  });

  it('reads <iframe youtube>', () => {
    const html = '<iframe src="https://www.youtube.com/embed/abc"></iframe>';
    expect(extractVideo(html, BASE)).toBe('https://www.youtube.com/embed/abc');
  });

  it('null when nothing matches', () => {
    expect(extractAudio('<p>nothing</p>', BASE)).toBeNull();
    expect(extractVideo('<p>nothing</p>', BASE)).toBeNull();
  });
});

describe('extractTranscript', () => {
  it('extracts speaker-separated lines from a transcript div', () => {
    const html = `<div class="transcript">
      <p>Mario: Bok!</p>
      <p>Laura: Bok, kako si?</p>
    </div>`;
    expect(extractTranscript(html)).toBe('Mario: Bok!\nLaura: Bok, kako si?');
  });

  it('falls back to <pre>', () => {
    const html = `<pre>Zdravo</pre>`;
    expect(extractTranscript(html)).toBe('Zdravo');
  });

  it('returns null when there is no transcript', () => {
    expect(extractTranscript('<p>nothing</p>')).toBeNull();
  });
});

describe('parseLesson (integration)', () => {
  it('assembles all fields from a rich page', () => {
    const html = `
      <html><head><meta name="level" content="Intermediate"><meta name="unit" content="Unit 3 — Hobiji"></head>
      <body>
        <h1>Slobodno vrijeme</h1>
        <audio src="/media/hobiji.mp3"></audio>
        <div class="transcript">
          <p>Mario: Što radiš u slobodno vrijeme?</p>
          <p>Laura: Često plivam.</p>
        </div>
      </body></html>`;
    expect(parseLesson(html, BASE)).toEqual({
      title: 'Slobodno vrijeme',
      level: 'Intermediate',
      unitTitle: 'Unit 3 — Hobiji',
      unitPosition: 3,
      audioUrl: 'https://takolako.com/media/hobiji.mp3',
      videoUrl: null,
      transcript: 'Mario: Što radiš u slobodno vrijeme?\nLaura: Često plivam.',
    });
  });
});
