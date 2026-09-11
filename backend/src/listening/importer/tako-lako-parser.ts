/**
 * Pure parsers for the Tako Lako catalog page (takolako.org content-overview).
 * No IO, no Prisma — importable from tests without a DB or network.
 *
 * The overview page links to lesson chapters hosted on Pressbooks
 * (utexas.pressbooks.pub/takolako/chapter/uN-mM-lessonL[-type]/). We
 * extract those links, classify each by type (main lesson, grammar,
 * vocabulary, pronunciation, video), and group them by the base
 * (unit, module, lesson) triple so one lesson becomes one DB record
 * with several sibling URLs.
 */

export type PressbooksResourceType = 'main' | 'grammar' | 'vocabulary' | 'pronunciation' | 'video';

export interface PressbooksLink {
  url: string;
  unit: number;
  module: number;
  lesson: number;
  type: PressbooksResourceType;
  text: string;
}

export interface GroupedLesson {
  unit: number;
  module: number;
  lesson: number;
  key: string;
  title: string | null;
  lessonUrl: string | null;
  grammarUrl: string | null;
  vocabularyUrl: string | null;
  pronunciationUrl: string | null;
  videoUrl: string | null;
}

const PRESSBOOKS_HOST = 'utexas.pressbooks.pub';

/**
 * Matches Pressbooks chapter URLs like:
 *   .../chapter/u1-m1-lesson1/
 *   .../chapter/u1-m1-lesson1-grammar/
 *   .../chapter/u10-m3-lesson2-vocabulary/
 *   .../chapter/u2-m2-lesson2-grammar-2/       — accepts trailing suffix
 * A trailing #anchor is ignored (grouping happens on the base URL).
 */
const CHAPTER_RE =
  /pressbooks\.pub\/takolako\/chapter\/u(\d+)-m(\d+)-lesson(\d+)(?:-(grammar|vocabulary|pronunciation|video)(?:-\d+)?)?\/?/i;

/** Overview chapters carry the whole Unit — never a lesson. Ignored. */
const OVERVIEW_RE = /pressbooks\.pub\/takolako\/chapter\/u(\d+)-overview\/?/i;

const decodeEntities = (input: string): string =>
  input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const stripHtml = (fragment: string): string =>
  decodeEntities(fragment.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();

/** Extracts each <a href="…">TEXT</a> together with its text content. */
function extractAnchors(html: string): { href: string; text: string }[] {
  const anchors: { href: string; text: string }[] = [];
  const re = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    anchors.push({ href: match[1], text: stripHtml(match[2]) });
  }
  return anchors;
}

function stripFragment(url: string): string {
  const hashAt = url.indexOf('#');
  return hashAt >= 0 ? url.slice(0, hashAt) : url;
}

/** Returns every Pressbooks chapter link that names a lesson (not overview). */
export function extractPressbooksLinks(html: string): PressbooksLink[] {
  const seen = new Set<string>();
  const out: PressbooksLink[] = [];
  for (const anchor of extractAnchors(html)) {
    if (!anchor.href.includes(PRESSBOOKS_HOST)) continue;
    if (OVERVIEW_RE.test(anchor.href)) continue;
    const match = CHAPTER_RE.exec(anchor.href);
    if (!match) continue;
    const url = stripFragment(anchor.href);
    // Dedupe on the actual (base) URL: the same page may be linked twice with
    // different anchors like #pronoun and #biti — one Pressbooks resource.
    if (seen.has(url)) continue;
    seen.add(url);
    const type: PressbooksResourceType = (match[4]?.toLowerCase() as PressbooksResourceType | undefined) ?? 'main';
    out.push({
      url,
      unit: Number(match[1]),
      module: Number(match[2]),
      lesson: Number(match[3]),
      type,
      text: anchor.text,
    });
  }
  return out;
}

const lessonKey = (unit: number, module: number, lesson: number): string =>
  `u${unit}-m${module}-lesson${lesson}`;

function pickTitle(mainText: string | undefined, fallback: string): string {
  const trimmed = mainText?.trim();
  if (!trimmed) return fallback;
  // Anchor text that is just the URL (or blatantly repeats it) is useless — skip it.
  if (/^https?:\/\//.test(trimmed)) return fallback;
  if (trimmed.length > 120) return fallback;
  return trimmed;
}

/**
 * Groups a flat list of Pressbooks links into one record per lesson,
 * carrying the type-specific URLs as sibling fields.
 */
export function groupLessons(links: PressbooksLink[]): GroupedLesson[] {
  const map = new Map<string, GroupedLesson>();
  const mainTextByKey = new Map<string, string>();
  for (const link of links) {
    const key = lessonKey(link.unit, link.module, link.lesson);
    let record = map.get(key);
    if (!record) {
      record = {
        unit: link.unit,
        module: link.module,
        lesson: link.lesson,
        key,
        title: null,
        lessonUrl: null,
        grammarUrl: null,
        vocabularyUrl: null,
        pronunciationUrl: null,
        videoUrl: null,
      };
      map.set(key, record);
    }
    switch (link.type) {
      case 'main':
        record.lessonUrl = record.lessonUrl ?? link.url;
        if (!mainTextByKey.has(key)) mainTextByKey.set(key, link.text);
        break;
      case 'grammar':
        record.grammarUrl = record.grammarUrl ?? link.url;
        break;
      case 'vocabulary':
        record.vocabularyUrl = record.vocabularyUrl ?? link.url;
        break;
      case 'pronunciation':
        record.pronunciationUrl = record.pronunciationUrl ?? link.url;
        break;
      case 'video':
        record.videoUrl = record.videoUrl ?? link.url;
        break;
    }
  }
  for (const record of map.values()) {
    const fallback = `Unit ${record.unit} · Module ${record.module} · Lesson ${record.lesson}`;
    record.title = pickTitle(mainTextByKey.get(record.key), fallback);
  }
  return Array.from(map.values()).sort(
    (a, b) => a.unit - b.unit || a.module - b.module || a.lesson - b.lesson,
  );
}

/** Convenience: parse and group in one call. */
export function parseCatalog(html: string): GroupedLesson[] {
  return groupLessons(extractPressbooksLinks(html));
}
