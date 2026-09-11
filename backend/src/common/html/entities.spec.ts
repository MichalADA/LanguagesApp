import { decodeHtmlEntities } from './entities';

describe('decodeHtmlEntities', () => {
  it('decodes numeric decimal entities (the Pressbooks title case)', () => {
    expect(decodeHtmlEntities('Module 1 &#8211; Lesson 1: Dobar dan!')).toBe('Module 1 – Lesson 1: Dobar dan!');
  });

  it('decodes numeric hex entities', () => {
    expect(decodeHtmlEntities('&#x2014; em dash')).toBe('— em dash');
    expect(decodeHtmlEntities('&#X2013;')).toBe('–');
  });

  it('decodes common named entities', () => {
    expect(decodeHtmlEntities('&amp;')).toBe('&');
    expect(decodeHtmlEntities('&lt;p&gt;')).toBe('<p>');
    expect(decodeHtmlEntities('&quot;x&quot;')).toBe('"x"');
    expect(decodeHtmlEntities('a&nbsp;b')).toBe('a b');
    expect(decodeHtmlEntities('a&mdash;b&ndash;c')).toBe('a—b–c');
    expect(decodeHtmlEntities('&laquo;x&raquo;')).toBe('«x»');
  });

  it('leaves unknown named entities untouched', () => {
    expect(decodeHtmlEntities('&madeup; & rest')).toBe('&madeup; & rest');
  });

  it('leaves malformed entities untouched', () => {
    expect(decodeHtmlEntities('&#notanumber;')).toBe('&#notanumber;');
  });

  it('is a no-op when there are no entities', () => {
    expect(decodeHtmlEntities('plain text')).toBe('plain text');
  });

  it('decodes multiple entities in one pass', () => {
    expect(decodeHtmlEntities('&amp;&#8211;&mdash;')).toBe('&–—');
  });
});
