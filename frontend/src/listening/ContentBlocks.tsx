import type { ListeningContentBlock } from "./types";

interface HeadingMeta { level?: number }
interface TranscriptMeta { speakers?: boolean }

function parseMeta<T>(raw: string | null): T {
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}

function TranscriptBlock({ text, meta }: { text: string; meta: TranscriptMeta }) {
  if (!meta.speakers) {
    return <p style={{ whiteSpace: "pre-wrap" }}>{text}</p>;
  }
  const lines = text.split("\n").map((line) => {
    const match = line.match(/^([A-ZÀ-ŽČĆĐŠŽ][\w\s.'-]{0,40}):\s*(.*)$/);
    return match ? { speaker: match[1], text: match[2] } : { speaker: null, text: line };
  });
  return (
    <div className="stack">
      {lines.map((line, idx) => (
        <div key={idx}>
          {line.speaker && <div className="eyebrow">{line.speaker}</div>}
          <p style={{ margin: 0 }}>{line.text}</p>
        </div>
      ))}
    </div>
  );
}

function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

function renderBlock(block: ListeningContentBlock, exerciseLabel: string) {
  switch (block.type) {
    case "HEADING": {
      const { level = 2 } = parseMeta<HeadingMeta>(block.metadataJson);
      const style: React.CSSProperties = { fontSize: level <= 2 ? 22 : 18 };
      if (level >= 4) return <h4 style={style}>{block.text}</h4>;
      if (level === 3) return <h3 style={style}>{block.text}</h3>;
      return <h2 style={style}>{block.text}</h2>;
    }
    case "PARAGRAPH":
      return <p style={{ lineHeight: 1.6 }}>{block.text}</p>;
    case "IMAGE":
      if (!block.url) return null;
      return (
        <figure style={{ margin: 0 }}>
          <img src={block.url} alt={block.text ?? ""} style={{ maxWidth: "100%", borderRadius: 8 }} />
          {block.text && <figcaption className="dim" style={{ fontSize: 13 }}>{block.text}</figcaption>}
        </figure>
      );
    case "AUDIO":
      if (!block.url) return null;
      return <audio controls preload="none" src={block.url} style={{ width: "100%" }} />;
    case "VIDEO":
      if (!block.url) return null;
      if (isYouTube(block.url)) {
        return (
          <iframe
            title={block.text ?? "video"}
            src={block.url}
            style={{ width: "100%", aspectRatio: "16/9", border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
      return <video controls preload="none" src={block.url} style={{ width: "100%" }} />;
    case "TRANSCRIPT":
      if (!block.text) return null;
      return <TranscriptBlock text={block.text} meta={parseMeta<TranscriptMeta>(block.metadataJson)} />;
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
          {block.text}
        </blockquote>
      );
    case "EXERCISE":
      return (
        <div className="panel panel-pad stack" style={{ borderStyle: "dashed" }}>
          <span className="eyebrow">{exerciseLabel}</span>
          {block.text && <p>{block.text}</p>}
          {block.url && (
            <a href={block.url} target="_blank" rel="noreferrer">
              {block.text ?? exerciseLabel} →
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
}: {
  blocks: ListeningContentBlock[];
  exerciseLabel: string;
}) {
  return (
    <div className="stack">
      {blocks.map((block) => (
        <div key={block.id}>{renderBlock(block, exerciseLabel)}</div>
      ))}
    </div>
  );
}

/** Concatenate PARAGRAPH + TRANSCRIPT + NOTE text for vocabulary coverage. */
export function coverageTextFromBlocks(blocks: ListeningContentBlock[]): string {
  return blocks
    .filter((b) => (b.type === "PARAGRAPH" || b.type === "TRANSCRIPT" || b.type === "NOTE" || b.type === "HEADING") && b.text)
    .map((b) => b.text as string)
    .join("\n");
}
