import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useT } from "@/i18n";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { fetchLesson } from "./api";
import type { ListeningLesson } from "./types";
import { analyzeTranscript, buildKnownSet, type TranscriptAnalysis } from "./transcriptAnalysis";

interface TranscriptLine {
  speaker: string | null;
  text: string;
}

function parseTranscriptLines(transcript: string): TranscriptLine[] {
  return transcript.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return { speaker: null, text: "" };
    const match = trimmed.match(/^([A-ZÀ-ŽČĆĐŠŽ][\w\s.'-]{0,40}):\s*(.*)$/);
    if (match) return { speaker: match[1], text: match[2] };
    return { speaker: null, text: trimmed };
  }).filter((line) => line.text.length > 0 || line.speaker !== null);
}

export function ListeningLessonPage() {
  const t = useT();
  const { lessonId = "" } = useParams();
  const { entries } = useVocabulary();
  const [lesson, setLesson] = useState<ListeningLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchLesson(lessonId, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) setLesson(payload);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("listening.loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [lessonId, t]);

  const knownSet = useMemo(() => buildKnownSet(entries), [entries]);
  const analysis: TranscriptAnalysis | null = useMemo(() => {
    if (!lesson?.transcript) return null;
    return analyzeTranscript(lesson.transcript, knownSet);
  }, [lesson, knownSet]);

  const transcriptLines = useMemo(
    () => (lesson?.transcript ? parseTranscriptLines(lesson.transcript) : []),
    [lesson],
  );

  if (loading) return <div className="page"><p role="status">{t("common.loading")}</p></div>;
  if (error || !lesson) return <div className="page"><p role="alert">{error ?? t("listening.loadError")}</p></div>;

  const source = lesson.unit.source;

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{source.name} · {lesson.unit.level ?? ""} · {lesson.unit.title}</span>
        <h1>{lesson.title}</h1>
        <Link className="mono dim" to={`/listening/${source.slug}`}>{t("listening.backToSource")}</Link>
      </header>

      {(lesson.audioUrl || lesson.videoUrl) && (
        <section className="panel panel-pad stack" aria-label={t("listening.media")}>
          {lesson.audioUrl && (
            <audio controls preload="none" src={lesson.audioUrl} style={{ width: "100%" }}>
              <track kind="captions" />
            </audio>
          )}
          {lesson.videoUrl && (
            /youtube\.com|youtu\.be/.test(lesson.videoUrl) ? (
              <iframe
                title={lesson.title}
                src={lesson.videoUrl}
                style={{ width: "100%", aspectRatio: "16/9", border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video controls preload="none" src={lesson.videoUrl} style={{ width: "100%" }}>
                <track kind="captions" />
              </video>
            )
          )}
        </section>
      )}

      {lesson.transcript && (
        <section className="panel panel-pad stack" style={{ marginTop: 16 }}>
          <h2>{t("listening.transcript")}</h2>
          <div className="stack">
            {transcriptLines.map((line, idx) => (
              <div key={idx}>
                {line.speaker && <div className="eyebrow">{line.speaker}</div>}
                <p style={{ margin: 0 }}>{line.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {analysis && (
        <section className="panel panel-pad stack" style={{ marginTop: 16 }} aria-label={t("listening.coverage.title")}>
          <h2>{t("listening.coverage.title")}</h2>
          <p className="lede">
            {t("listening.coverage.headline", { percent: analysis.coveragePercent })}
          </p>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={analysis.coveragePercent}>
            <span style={{ width: `${analysis.coveragePercent}%` }} />
          </div>
          <ul className="row" style={{ flexWrap: "wrap", gap: 16, listStyle: "none", padding: 0 }}>
            <li>{t("listening.coverage.total")}: <strong>{analysis.totalWords}</strong></li>
            <li>{t("listening.coverage.unique")}: <strong>{analysis.uniqueWords}</strong></li>
            <li>{t("listening.coverage.known")}: <strong>{analysis.knownWords}</strong></li>
            <li>{t("listening.coverage.missing")}: <strong>{analysis.missingWords}</strong></li>
          </ul>
          {analysis.missing.length > 0 && (
            <div className="stack">
              <h3 style={{ fontSize: 16 }}>{t("listening.coverage.missingHeader")}</h3>
              <div className="radio-tags">
                {analysis.missing.map((word) => (
                  <span className="badge" key={word}>{word}</span>
                ))}
              </div>
              <p className="dim" style={{ fontSize: 12 }}>{t("listening.coverage.missingHint")}</p>
            </div>
          )}
        </section>
      )}

      {(lesson.grammarUrl || lesson.vocabularyUrl || lesson.pronunciationUrl) && (
        <section className="panel panel-pad stack" style={{ marginTop: 16 }}>
          <h2>{t("listening.related")}</h2>
          <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
            {lesson.grammarUrl && (
              <li>
                <a href={lesson.grammarUrl} target="_blank" rel="noreferrer">
                  {t("listening.grammar")} →
                </a>
              </li>
            )}
            {lesson.vocabularyUrl && (
              <li>
                <a href={lesson.vocabularyUrl} target="_blank" rel="noreferrer">
                  {t("listening.vocabulary")} →
                </a>
              </li>
            )}
            {lesson.pronunciationUrl && (
              <li>
                <a href={lesson.pronunciationUrl} target="_blank" rel="noreferrer">
                  {t("listening.pronunciation")} →
                </a>
              </li>
            )}
          </ul>
        </section>
      )}

      <p className="stat-note">
        {source.attribution && <>{t("listening.attribution")}: {source.attribution} · </>}
        {source.license && <>{t("listening.license")}: {source.license} · </>}
        {lesson.sourceUrl && (
          <a href={lesson.sourceUrl} target="_blank" rel="noreferrer">{t("listening.openOriginal")}</a>
        )}
      </p>
    </div>
  );
}
