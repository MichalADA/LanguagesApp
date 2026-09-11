import type { ListeningContentBlock } from "./types";
import { AudioBlock } from "./AudioBlock";

interface HeadingMeta { level?: number }
interface TranscriptMeta { speakers?: boolean }

function parseMeta<T>(raw: string | null): T {
  if (!raw) return {} as T;
  try { return JSON.parse(raw) as T; } catch { return {} as T; }
}

function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

/**
 * Prefer sourceText (original language) for display; if a translation is
 * present, show it under the source in a muted style. Falls back to the
 * legacy `text` field when neither is set.
 */
function primaryText(block: ListeningContentBlock): string | null {
  return block.sourceText ?? block.text ?? null;
}

function DualLanguage({ block, style }: { block: ListeningContentBlock; style?: React.CSSProperties }) {
  const source = primaryText(block);
  const translation = block.translatedText;
  return (
    <div className="stack" style={{ gap: 4 }}>
      {source && <p style={{ margin: 0, ...style }}>{source}</p>}
      {translation && (
        <p className="dim" style={{ margin: 0, fontSize: 13, fontStyle: "italic" }}>{translation}</p>
      )}
    </div>
  );
}

function TranscriptBlock({ block }: { block: ListeningContentBlock }) {
  const meta = parseMeta<TranscriptMeta>(block.metadataJson);
  const source = primaryText(block) ?? "";
  const translation = block.translatedText ?? "";
  const sourceLines = source.split("\n");
  const translationLines = translation ? translation.split("\n") : [];

  const parseLine = (line: string) => {
    const match = line.match(/^([A-ZÀ-ŽČĆĐŠŽ][\w\s.'-]{0,40}):\s*(.*)$/);
    return match ? { speaker: match[1], text: match[2] } : { speaker: null, text: line };
  };

  if (!meta.speakers && !block.speaker) {
    return <DualLanguage block={block} style={{ whiteSpace: "pre-wrap" }} />;
  }

  return (
    <div className="stack">
      {sourceLines.map((line, idx) => {
        const src = parseLine(line);
        const tr = translationLines[idx] ? parseLine(translationLines[idx]) : null;
        const label = block.speaker ?? src.speaker;
        return (
          <div key={idx}>
            {label && <div className="eyebrow">{label}</div>}
            <p style={{ margin: 0 }}>{src.text}</p>
            {tr?.text && (
              <p className="dim" style={{ margin: 0, fontSize: 13, fontStyle: "italic" }}>{tr.text}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderBlock(block: ListeningContentBlock, exerciseLabel: string, sourceFallbackUrl: string | null) {
  const display = primaryText(block);
  switch (block.type) {
    case "HEADING": {
      const { level = 2 } = parseMeta<HeadingMeta>(block.metadataJson);
      const style: React.CSSProperties = { fontSize: level <= 2 ? 22 : 18 };
      const HeadingTag = level >= 4 ? "h4" : level === 3 ? "h3" : "h2";
      return (
        <div className="stack" style={{ gap: 2 }}>
          <HeadingTag style={style}>{display}</HeadingTag>
          {block.translatedText && (
            <span className="dim" style={{ fontSize: 12, fontStyle: "italic" }}>{block.translatedText}</span>
          )}
        </div>
      );
    }
    case "PARAGRAPH":
      return <DualLanguage block={block} style={{ lineHeight: 1.6 }} />;
    case "IMAGE":
      if (!block.url) return null;
      return (
        <figure style={{ margin: 0 }}>
          <img src={block.url} alt={display ?? ""} style={{ maxWidth: "100%", borderRadius: 8 }} />
          {display && <figcaption className="dim" style={{ fontSize: 13 }}>{display}</figcaption>}
        </figure>
      );
    case "AUDIO":
      if (!block.url) return null;
      return <AudioBlock src={block.url} title={display} fallbackUrl={sourceFallbackUrl} />;
    case "VIDEO":
      if (!block.url) return null;
      if (isYouTube(block.url)) {
        return (
          <iframe
            title={display ?? "video"}
            src={block.url}
            style={{ width: "100%", aspectRatio: "16/9", border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
      return <video controls preload="none" src={block.url} style={{ width: "100%" }} />;
    case "TRANSCRIPT":
      if (!display) return null;
      return <TranscriptBlock block={block} />;
    case "NOTE":
      return (
        <blockquote
          style={{
            margin: 0,
            padding: "12px 14px",
            borderLeft: "3px solid var(--accent)",
            background: "var(--panel)",
            borderRadius: 6,
          }}
        >
          <DualLanguage block={block} />
        </blockquote>
      );
    case "EXERCISE":
      return (
        <div className="panel panel-pad stack" style={{ borderStyle: "dashed" }}>
          <span className="eyebrow">{exerciseLabel}</span>
          {display && <p>{display}</p>}
          {block.url && (
            <a href={block.url} target="_blank" rel="noopener noreferrer">
              {display ?? exerciseLabel} →
            </a>
          )}
        </div>
      );
    default:
      return null;
  }
}

export function ContentBlocks({
  blocks,
  exerciseLabel,
  sourceFallbackUrl,
}: {
  blocks: ListeningContentBlock[];
  exerciseLabel: string;
  sourceFallbackUrl: string | null;
}) {
  return (
    <div className="stack">
      {blocks.map((block) => (
        <div key={block.id}>{renderBlock(block, exerciseLabel, sourceFallbackUrl)}</div>
      ))}
    </div>
  );
}

/**
 * Text used for vocabulary coverage — ONLY the source-language content of
 * TRANSCRIPT blocks (and any block that explicitly carries `sourceText`
 * marked by the parser). We never analyse `translatedText` or the legacy
 * `text` field of PARAGRAPH/NOTE/HEADING blocks — those may be translations
 * or app-generated hints that would pollute the missing-words list.
 */
export function coverageTextFromBlocks(blocks: ListeningContentBlock[]): string {
  const chunks: string[] = [];
  for (const block of blocks) {
    if (block.sourceText) {
      chunks.push(block.sourceText);
      continue;
    }
    // Legacy blocks: only trust TRANSCRIPT.text as source-language content.
    if (block.type === "TRANSCRIPT" && block.text) chunks.push(block.text);
  }
  return chunks.join("\n");
}
