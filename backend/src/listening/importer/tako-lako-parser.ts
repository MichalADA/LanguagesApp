/**
 * Pure parsers for Tako Lako HTML — no IO, no Prisma. The importer script
 * uses these to turn a fetched page into a `ParsedLesson`; tests use these
 * directly on fixture HTML.
 */

export interface ParsedLesson {
  title: string;
  level: string;
  unitTitle: string;
  unitPosition: number;
  audioUrl: string | null;
  videoUrl: string | null;
  transcript: string | null;
}

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

const findFirst = (pattern: RegExp, html: string): string | null =>
  html.match(pattern)?.[1] ?? null;

export function extractLessonLinks(html: string, baseUrl: string, indexUrl: string): string[] {
  const links = new Set<string>();
  const re = /<a\s[^>]*href="([^"]+)"[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const href = match[1];
    if (!href) continue;
    const absolute = href.startsWith('http') ? href : href.startsWith('/') ? `${baseUrl}${href}` : null;
    if (!absolute) continue;
    if (/\/lessons?\//i.test(absolute) && absolute !== indexUrl) links.add(absolute);
  }
  return Array.from(links);
}

export function extractLevel(html: string): string {
  const raw = findFirst(/data-level="([^"]+)"/i, html)
    ?? findFirst(/<meta\s+name="level"\s+content="([^"]+)"/i, html)
    ?? findFirst(/class="level"[^>]*>([^<]+)</i, html)
    ?? 'Beginner';
  return raw.trim();
}

export function extractUnit(html: string): { title: string; position: number } {
  const title = findFirst(/data-unit="([^"]+)"/i, html)
    ?? findFirst(/<meta\s+name="unit"\s+content="([^"]+)"/i, html)
    ?? findFirst(/class="unit"[^>]*>([^<]+)</i, html)
    ?? 'Unit 1';
  const positionRaw = findFirst(/data-unit-position="(\d+)"/i, html)
    ?? findFirst(/Unit\s+(\d+)/i, title);
  return {
    title: title.trim(),
    position: positionRaw ? Number(positionRaw) : 1,
  };
}

export function extractTitle(html: string): string {
  return findFirst(/<h1[^>]*>([^<]+)<\/h1>/i, html)?.trim()
    ?? findFirst(/<title>([^<]+)<\/title>/i, html)?.trim()
    ?? 'Untitled';
}

export function extractAudio(html: string, baseUrl: string): string | null {
  const src = findFirst(/<audio[^>]*src="([^"]+)"/i, html)
    ?? findFirst(/<source[^>]*src="([^"]+\.(?:mp3|m4a|ogg|wav))"/i, html);
  if (!src) return null;
  return src.startsWith('http') ? src : src.startsWith('/') ? `${baseUrl}${src}` : null;
}

export function extractVideo(html: string, baseUrl: string): string | null {
  const src = findFirst(/<video[^>]*src="([^"]+)"/i, html)
    ?? findFirst(/<iframe[^>]*src="([^"]+youtube[^"]+)"/i, html)
    ?? findFirst(/<source[^>]*src="([^"]+\.(?:mp4|webm))"/i, html);
  if (!src) return null;
  return src.startsWith('http') ? src : src.startsWith('/') ? `${baseUrl}${src}` : null;
}

export function extractTranscript(html: string): string | null {
  const block = findFirst(/<div[^>]*(?:class|id)="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i, html)
    ?? findFirst(/<section[^>]*(?:class|id)="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/section>/i, html)
    ?? findFirst(/<pre[^>]*>([\s\S]*?)<\/pre>/i, html);
  if (!block) return null;
  const lines = block
    .split(/<br\s*\/?>|<\/p>|<\/li>/i)
    .map((chunk) => stripHtml(chunk))
    .filter(Boolean);
  return lines.join('\n');
}

export function parseLesson(html: string, baseUrl: string): ParsedLesson {
  const unit = extractUnit(html);
  return {
    title: extractTitle(html),
    level: extractLevel(html),
    unitTitle: unit.title,
    unitPosition: unit.position,
    audioUrl: extractAudio(html, baseUrl),
    videoUrl: extractVideo(html, baseUrl),
    transcript: extractTranscript(html),
  };
}
