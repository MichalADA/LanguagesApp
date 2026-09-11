/**
 * Turns a Pressbooks/Tako Lako lesson HTML page into a semantic list of
 * `ParsedContentBlock`s ready for `ListeningContentBlock` rows.
 *
 * The goal is CONTENT, not markup fidelity: we take headings, paragraphs,
 * images, media, transcripts and iframes that look like exercises, and drop
 * everything else — nav, footer, sidebar, styles, scripts. Nothing here
 * touches Prisma or the network; the file is pure so tests can drive it
 * with fixture HTML.
 */

import { decodeHtmlEntities } from '../../common/html/entities';

export type ParsedBlockType =
  | 'HEADING'
  | 'PARAGRAPH'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'TRANSCRIPT'
  | 'EXERCISE'
  | 'NOTE';

export interface ParsedContentBlock {
  type: ParsedBlockType;
  text: string | null;
  url: string | null;
  metadata: Record<string, string | number | boolean> | null;
}

/** Segments of a Pressbooks page that never carry lesson content. */
const NOISE_TAGS = new Set(['script', 'style', 'nav', 'header', 'footer', 'aside', 'form', 'noscript']);
/** CSS class or id substrings that mark navigation/chrome regardless of tag. */
const NOISE_CLASS_HINTS = [
  'site-header',
  'site-footer',
  'wp-block-navigation',
  'menu-',
  'nav-',
  'sidebar',
  'skip-link',
  'screen-reader',
  'edit-link',
  'entry-meta',
  'post-navigation',
  'social',
  'share',
  'breadcrumbs',
  'pagination',
];

/** Tags we keep as content, mapped to their block type when trivial. */
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

interface Token {
  kind: 'open' | 'close' | 'void' | 'text';
  tag?: string;
  raw: string;
  attrs?: Record<string, string>;
  text?: string;
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);

/** Minimal, forgiving tokenizer — good enough for well-formed CMS output. */
function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype[^>]*>|<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)\/?>/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (match.index > last) {
      const text = html.slice(last, match.index);
      tokens.push({ kind: 'text', raw: text, text });
    }
    last = match.index + match[0].length;
    if (match[0].startsWith('<!')) continue; // comment / doctype / cdata
    const tag = (match[1] ?? '').toLowerCase();
    const attrs = parseAttrs(match[2] ?? '');
    if (match[0].startsWith('</')) {
      tokens.push({ kind: 'close', tag, raw: match[0] });
    } else if (VOID_ELEMENTS.has(tag) || match[0].endsWith('/>')) {
      tokens.push({ kind: 'void', tag, raw: match[0], attrs });
    } else {
      tokens.push({ kind: 'open', tag, raw: match[0], attrs });
    }
  }
  if (last < html.length) {
    const text = html.slice(last);
    tokens.push({ kind: 'text', raw: text, text });
  }
  return tokens;
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_][\w:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const name = match[1].toLowerCase();
    attrs[name] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function isNoiseClass(attrs: Record<string, string> | undefined): boolean {
  if (!attrs) return false;
  const bag = `${attrs.class ?? ''} ${attrs.id ?? ''} ${attrs.role ?? ''}`.toLowerCase();
  return NOISE_CLASS_HINTS.some((hint) => bag.includes(hint));
}

/**
 * Grabs the substring between an opening tag whose attributes match `matcher`
 * and its matching closing tag, respecting nesting depth. Returns the inner
 * HTML, or null when no such element is found.
 */
function extractByMatcher(
  html: string,
  tagCandidates: string[],
  matcher: (attrs: Record<string, string>) => boolean,
): string | null {
  const tokens = tokenize(html);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind !== 'open' || !token.tag) continue;
    if (!tagCandidates.includes(token.tag)) continue;
    if (!matcher(token.attrs ?? {})) continue;
    let depth = 1;
    const start = i + 1;
    for (let j = start; j < tokens.length; j++) {
      const next = tokens[j];
      if (next.tag !== token.tag) continue;
      if (next.kind === 'open') depth++;
      else if (next.kind === 'close') {
        depth--;
        if (depth === 0) {
          return tokens.slice(start, j).map((t) => t.raw).join('');
        }
      }
    }
  }
  return null;
}

function classMatcher(hint: string): (attrs: Record<string, string>) => boolean {
  return (attrs) => `${attrs.class ?? ''} ${attrs.id ?? ''}`.toLowerCase().includes(hint);
}

/**
 * Finds the main content region of a Pressbooks page.
 * Tries a series of container candidates in order of specificity.
 */
export function extractMainRegion(html: string): string {
  const candidates: (() => string | null)[] = [
    () => extractByMatcher(html, ['div', 'section', 'article'], classMatcher('entry-content')),
    () => extractByMatcher(html, ['section'], classMatcher('section-content')),
    () => extractByMatcher(html, ['article'], () => true),
    () => extractByMatcher(html, ['main'], () => true),
  ];
  for (const attempt of candidates) {
    const region = attempt();
    if (region && region.trim().length > 0) return region;
  }
  return html; // last resort — we still filter noise per element
}

function textOf(inner: string): string {
  return decodeHtmlEntities(inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

/** Reads consecutive tokens until the matching close tag; returns inner tokens. */
function innerTokens(tokens: Token[], startIndex: number, tag: string): { inner: Token[]; end: number } {
  let depth = 1;
  const inner: Token[] = [];
  let j = startIndex + 1;
  for (; j < tokens.length; j++) {
    const next = tokens[j];
    if (next.tag === tag) {
      if (next.kind === 'open') depth++;
      else if (next.kind === 'close') {
        depth--;
        if (depth === 0) break;
      }
    }
    inner.push(next);
  }
  return { inner, end: j };
}

const innerHtml = (inner: Token[]): string => inner.map((t) => t.raw).join('');

function classifyIframe(src: string): { type: ParsedBlockType; extra: Record<string, string> } {
  if (/youtube\.com|youtu\.be|player\.vimeo\.com/i.test(src)) {
    return { type: 'VIDEO', extra: { provider: /youtu/i.test(src) ? 'youtube' : 'vimeo' } };
  }
  if (/h5p|hypothes\.is|quizlet|kahoot/i.test(src)) {
    return { type: 'EXERCISE', extra: { provider: 'external' } };
  }
  return { type: 'EXERCISE', extra: {} };
}

function transcriptLooksReal(text: string): boolean {
  // Two or more speaker-labeled lines is a strong signal of an actual dialog.
  const speakerLines = text.split('\n').filter((line) => /^[A-ZÀ-ŽČĆĐŠŽ][\w\s.'-]{0,40}:/.test(line));
  return speakerLines.length >= 2;
}

function decodeAttribute(value: string | undefined): string {
  return decodeHtmlEntities((value ?? '').trim());
}

function pushBlock(
  blocks: ParsedContentBlock[],
  block: Omit<ParsedContentBlock, 'metadata'> & { metadata?: Record<string, string | number | boolean> | null },
): void {
  const meta = block.metadata ?? null;
  blocks.push({ type: block.type, text: block.text, url: block.url, metadata: meta });
}

/** Turns a lesson HTML string into an ordered list of content blocks. */
export function parseLessonContent(html: string): ParsedContentBlock[] {
  const region = extractMainRegion(html);
  const tokens = tokenize(region);
  const blocks: ParsedContentBlock[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === 'text') continue;

    if (token.tag && NOISE_TAGS.has(token.tag)) {
      if (token.kind === 'open') {
        const { end } = innerTokens(tokens, i, token.tag);
        i = end;
      }
      continue;
    }
    if (isNoiseClass(token.attrs)) {
      if (token.kind === 'open' && token.tag) {
        const { end } = innerTokens(tokens, i, token.tag);
        i = end;
      }
      continue;
    }

    if (token.kind === 'open' && token.tag && HEADING_TAGS.has(token.tag)) {
      const { inner, end } = innerTokens(tokens, i, token.tag);
      const text = textOf(innerHtml(inner));
      if (text) pushBlock(blocks, { type: 'HEADING', text, url: null, metadata: { level: Number(token.tag[1]) } });
      i = end;
      continue;
    }

    if (token.kind === 'open' && token.tag === 'p') {
      const { inner, end } = innerTokens(tokens, i, 'p');
      const text = textOf(innerHtml(inner));
      if (text) pushBlock(blocks, { type: 'PARAGRAPH', text, url: null, metadata: null });
      i = end;
      continue;
    }

    if (token.kind === 'open' && token.tag === 'blockquote') {
      const { inner, end } = innerTokens(tokens, i, 'blockquote');
      const text = textOf(innerHtml(inner));
      if (text) pushBlock(blocks, { type: 'NOTE', text, url: null, metadata: null });
      i = end;
      continue;
    }

    // Transcript-looking region: any div/section/pre with "transcript" in class/id.
    if (
      token.kind === 'open'
      && token.tag
      && ['div', 'section', 'pre'].includes(token.tag)
      && `${token.attrs?.class ?? ''} ${token.attrs?.id ?? ''}`.toLowerCase().includes('transcript')
    ) {
      const { inner, end } = innerTokens(tokens, i, token.tag);
      const raw = innerHtml(inner);
      const lines = raw
        .split(/<br\s*\/?>|<\/p>|<\/li>/i)
        .map((chunk) => textOf(chunk))
        .filter(Boolean);
      const text = lines.join('\n');
      if (text) {
        pushBlock(blocks, {
          type: 'TRANSCRIPT',
          text,
          url: null,
          metadata: { speakers: transcriptLooksReal(text) },
        });
      }
      i = end;
      continue;
    }

    if (token.tag === 'img' && (token.kind === 'void' || token.kind === 'open')) {
      const src = decodeAttribute(token.attrs?.src);
      if (src) {
        pushBlock(blocks, {
          type: 'IMAGE',
          text: decodeAttribute(token.attrs?.alt) || null,
          url: src,
          metadata: null,
        });
      }
      if (token.kind === 'open' && token.tag) {
        const { end } = innerTokens(tokens, i, token.tag);
        i = end;
      }
      continue;
    }

    if (token.kind === 'open' && token.tag === 'audio') {
      const { inner, end } = innerTokens(tokens, i, 'audio');
      let src = decodeAttribute(token.attrs?.src);
      if (!src) {
        for (const child of inner) {
          if (child.tag === 'source' && child.attrs?.src) {
            src = decodeAttribute(child.attrs.src);
            break;
          }
        }
      }
      if (src) pushBlock(blocks, { type: 'AUDIO', text: null, url: src, metadata: null });
      i = end;
      continue;
    }

    if (token.kind === 'open' && token.tag === 'video') {
      const { inner, end } = innerTokens(tokens, i, 'video');
      let src = decodeAttribute(token.attrs?.src);
      if (!src) {
        for (const child of inner) {
          if (child.tag === 'source' && child.attrs?.src) {
            src = decodeAttribute(child.attrs.src);
            break;
          }
        }
      }
      if (src) pushBlock(blocks, { type: 'VIDEO', text: null, url: src, metadata: null });
      i = end;
      continue;
    }

    if ((token.kind === 'open' || token.kind === 'void') && token.tag === 'iframe') {
      const src = decodeAttribute(token.attrs?.src);
      if (src) {
        const { type, extra } = classifyIframe(src);
        pushBlock(blocks, {
          type,
          text: decodeAttribute(token.attrs?.title) || null,
          url: src,
          metadata: extra,
        });
      }
      if (token.kind === 'open' && token.tag) {
        const { end } = innerTokens(tokens, i, token.tag);
        i = end;
      }
      continue;
    }
  }

  return blocks;
}
