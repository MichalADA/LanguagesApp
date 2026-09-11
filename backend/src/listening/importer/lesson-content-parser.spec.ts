import { parseLessonContent, extractMainRegion } from './lesson-content-parser';

const RICH_LESSON = `
<!doctype html>
<html>
<head><title>whatever</title><style>body{color:red}</style></head>
<body>
  <header class="site-header"><nav class="site-nav">MENU</nav></header>
  <main>
    <article class="entry-content">
      <h2>NAŠI STUDENTI</h2>
      <p>In today&#8217;s lesson &amp; dialogue.</p>
      <p>Meet Ana &#8211; Marko.</p>
      <figure><img src="/pressbooks-media/lesson1.png" alt="Ana i Marko"></figure>
      <audio src="/media/lesson1.mp3"></audio>
      <div class="transcript">
        <p>Ana: Dobar dan!</p>
        <p>Marko: Dobar dan!</p>
      </div>
      <blockquote>Zapamiętaj: Dobar dan to formalne powitanie.</blockquote>
      <iframe title="Ćwiczenie" src="https://h5p.example.com/embed/42"></iframe>
      <iframe title="Wideo" src="https://www.youtube.com/embed/abc"></iframe>
    </article>
  </main>
  <footer class="site-footer">FOOTER</footer>
  <script>tracker()</script>
</body>
</html>
`;

describe('extractMainRegion', () => {
  it('returns the .entry-content inner HTML', () => {
    const region = extractMainRegion(RICH_LESSON);
    expect(region).toContain('NAŠI STUDENTI');
    expect(region).not.toContain('MENU');
    expect(region).not.toContain('FOOTER');
    expect(region).not.toContain('<script>');
  });

  it('falls back to <article> then <main> when there is no entry-content', () => {
    expect(extractMainRegion('<article><p>x</p></article>')).toContain('<p>x</p>');
    expect(extractMainRegion('<main><p>y</p></main>')).toContain('<p>y</p>');
  });
});

describe('parseLessonContent', () => {
  const blocks = parseLessonContent(RICH_LESSON);
  const types = blocks.map((b) => b.type);

  it('yields blocks in document order', () => {
    expect(types).toEqual([
      'HEADING',
      'PARAGRAPH',
      'PARAGRAPH',
      'IMAGE',
      'AUDIO',
      'TRANSCRIPT',
      'NOTE',
      'EXERCISE',
      'VIDEO',
    ]);
  });

  it('decodes numeric entities in every block', () => {
    const p = blocks.find((b) => b.text?.includes('lesson'))!;
    expect(p.text).toBe('In today’s lesson & dialogue.');
    expect(blocks.find((b) => b.text?.includes('Meet Ana'))?.text).toBe('Meet Ana – Marko.');
  });

  it('records heading level in metadata and populates sourceText', () => {
    const heading = blocks[0];
    expect(heading.type).toBe('HEADING');
    expect(heading.text).toBe('NAŠI STUDENTI');
    expect(heading.sourceText).toBe('NAŠI STUDENTI');
    expect(heading.metadata).toEqual({ level: 2 });
  });

  it('carries image url and alt text as sourceText', () => {
    const image = blocks.find((b) => b.type === 'IMAGE')!;
    expect(image.url).toBe('/pressbooks-media/lesson1.png');
    expect(image.text).toBe('Ana i Marko');
    expect(image.sourceText).toBe('Ana i Marko');
  });

  it('carries audio and video urls', () => {
    expect(blocks.find((b) => b.type === 'AUDIO')?.url).toBe('/media/lesson1.mp3');
    expect(blocks.find((b) => b.type === 'VIDEO')?.url).toBe('https://www.youtube.com/embed/abc');
  });

  it('classifies transcripts, detects speakers, populates sourceText', () => {
    const transcript = blocks.find((b) => b.type === 'TRANSCRIPT')!;
    expect(transcript.text).toBe('Ana: Dobar dan!\nMarko: Dobar dan!');
    expect(transcript.sourceText).toBe('Ana: Dobar dan!\nMarko: Dobar dan!');
    expect(transcript.metadata).toEqual({ speakers: true });
  });

  it('marks blockquote as NOTE', () => {
    expect(blocks.find((b) => b.type === 'NOTE')?.text).toContain('Zapamiętaj');
  });

  it('classifies iframes into EXERCISE vs VIDEO by URL', () => {
    const exercise = blocks.find((b) => b.type === 'EXERCISE')!;
    expect(exercise.url).toBe('https://h5p.example.com/embed/42');
    const video = blocks.find((b) => b.type === 'VIDEO')!;
    expect(video.url).toBe('https://www.youtube.com/embed/abc');
  });

  it('drops navbar / footer / script / style noise', () => {
    for (const block of blocks) {
      expect(block.text ?? '').not.toMatch(/MENU|FOOTER|tracker/);
    }
  });

  it('is idempotent — parsing the same HTML twice yields identical blocks', () => {
    expect(parseLessonContent(RICH_LESSON)).toEqual(blocks);
  });
});

describe('parseLessonContent — text-extraction robustness', () => {
  it('does NOT glue adjacent block elements into one word', () => {
    const html = `
      <article class="entry-content">
        <h2>Naši studenti</h2><p>Poznaj naszych bohaterów.</p>
      </article>
    `;
    const blocks = parseLessonContent(html);
    expect(blocks[0].text).toBe('Naši studenti');
    expect(blocks[1].text).toBe('Poznaj naszych bohaterów.');
    for (const block of blocks) {
      expect(block.text).not.toMatch(/[Nn]ašistudenti/);
      expect(block.text).not.toMatch(/studentiPoznaj/);
    }
  });

  it('preserves inline word boundaries inside nested spans', () => {
    const html = `<article class="entry-content"><p><span>Dobar</span><span>dan</span></p></article>`;
    const block = parseLessonContent(html)[0];
    expect(block.text).toMatch(/Dobar\s+dan/);
  });
});

describe('parseLessonContent — audio extraction', () => {
  it('picks up an <a href="…mp3"> playback fallback next to <audio>', () => {
    const html = `<article class="entry-content"><audio><a href="https://example.com/lesson1.mp3">play</a></audio></article>`;
    const audio = parseLessonContent(html).find((b) => b.type === 'AUDIO');
    expect(audio?.url).toBe('https://example.com/lesson1.mp3');
  });

  it('emits an AUDIO block for a stand-alone .mp3 link outside <audio>', () => {
    const html = `<article class="entry-content"><p>Listen: <a href="/media/dobar-dan.mp3">Dobar dan</a></p></article>`;
    const audio = parseLessonContent(html).find((b) => b.type === 'AUDIO');
    expect(audio?.url).toBe('/media/dobar-dan.mp3');
    expect(audio?.text).toBe('Dobar dan');
  });

  it('accepts .m4a, .ogg, .wav', () => {
    for (const ext of ['m4a', 'ogg', 'wav']) {
      const html = `<article class="entry-content"><p><a href="/audio.${ext}">t</a></p></article>`;
      const audio = parseLessonContent(html).find((b) => b.type === 'AUDIO');
      expect(audio?.url).toBe(`/audio.${ext}`);
    }
  });

  it('does not misclassify a .html link as audio', () => {
    const html = `<article class="entry-content"><p><a href="/lesson.html">x</a></p></article>`;
    expect(parseLessonContent(html).find((b) => b.type === 'AUDIO')).toBeUndefined();
  });
});

describe('parseLessonContent — edge cases', () => {
  it('skips paragraphs that only wrap navigation-class regions', () => {
    const html = `
      <article class="entry-content">
        <div class="wp-block-navigation"><p>Home</p><p>About</p></div>
        <p>Real body text.</p>
      </article>
    `;
    const blocks = parseLessonContent(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'PARAGRAPH', text: 'Real body text.', sourceText: 'Real body text.' });
  });

  it('returns an empty list when the article is empty', () => {
    expect(parseLessonContent('<article class="entry-content"></article>')).toEqual([]);
  });
});
