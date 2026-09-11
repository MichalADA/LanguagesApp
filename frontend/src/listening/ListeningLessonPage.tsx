import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useT } from "@/i18n";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { fetchLesson } from "./api";
import type { ListeningLesson } from "./types";
import { analyzeTranscript, buildKnownSet, type TranscriptAnalysis } from "./transcriptAnalysis";
import { ContentBlocks, coverageTextFromBlocks } from "./ContentBlocks";

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
    if (!lesson) return null;
    const source = lesson.blocks?.length
      ? coverageTextFromBlocks(lesson.blocks)
      : lesson.transcript ?? "";
    if (!source) return null;
    return analyzeTranscript(source, knownSet);
  }, [lesson, knownSet]);

  if (loading) return <div className="page"><p role="status">{t("common.loading")}</p></div>;
  if (error || !lesson) return <div className="page"><p role="alert">{error ?? t("listening.loadError")}</p></div>;

  const source = lesson.unit.source;
  const contentAvailable = lesson.blocks?.length > 0;

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">
          {source.name} · {lesson.unit.level ?? ""} · {lesson.unit.title}
        </span>
        <h1>{lesson.title}</h1>
        <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link className="mono dim" to={`/listening/${source.slug}`}>{t("listening.backToSource")}</Link>
          {lesson.sourceUrl && (
            <a
              className="btn"
              href={lesson.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("listening.openOriginal")} ↗
            </a>
          )}
        </div>
      </header>

      {contentAvailable ? (
        <section className="panel panel-pad stack" aria-label={t("listening.content")}>
          <ContentBlocks
            blocks={lesson.blocks}
            exerciseLabel={t("listening.exercisePlaceholder")}
            sourceFallbackUrl={lesson.sourceUrl}
          />
        </section>
      ) : (
        <section className="panel panel-pad stack">
          <h2>{t("listening.contentUnavailableTitle")}</h2>
          <p className="muted">
            {lesson.contentStatus === "UNAVAILABLE"
              ? t("listening.contentUnavailableReason")
              : t("listening.contentNotImportedYet")}
          </p>
          {lesson.contentNote && <p className="dim" style={{ fontSize: 12 }}>{lesson.contentNote}</p>}
          {lesson.sourceUrl && (
            <a className="btn" href={lesson.sourceUrl} target="_blank" rel="noopener noreferrer">
              {t("listening.openOriginal")} →
            </a>
          )}
        </section>
      )}

      {analysis && (
        <section className="panel panel-pad stack" style={{ marginTop: 16 }} aria-label={t("listening.coverage.title")}>
          <h2>{t("listening.coverage.title")}</h2>
          <p className="lede">{t("listening.coverage.headline", { percent: analysis.coveragePercent })}</p>
          <div
            className="bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={analysis.coveragePercent}
          >
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
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                {analysis.missing.map((word) => <span className="badge" key={word}>{word}</span>)}
              </div>
              <p className="dim" style={{ fontSize: 12 }}>{t("listening.coverage.missingHint")}</p>
            </div>
          )}
        </section>
      )}

      {(lesson.grammarUrl || lesson.vocabularyUrl || lesson.pronunciationUrl || lesson.videoUrl) && (
        <section className="panel panel-pad stack" style={{ marginTop: 16 }}>
          <h2>{t("listening.related")}</h2>
          <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
            {lesson.grammarUrl && <li><a href={lesson.grammarUrl} target="_blank" rel="noopener noreferrer">{t("listening.grammar")} →</a></li>}
            {lesson.vocabularyUrl && <li><a href={lesson.vocabularyUrl} target="_blank" rel="noopener noreferrer">{t("listening.vocabulary")} →</a></li>}
            {lesson.pronunciationUrl && <li><a href={lesson.pronunciationUrl} target="_blank" rel="noopener noreferrer">{t("listening.pronunciation")} →</a></li>}
            {lesson.videoUrl && <li><a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer">{t("listening.videoExtra")} →</a></li>}
          </ul>
        </section>
      )}

      <section className="panel panel-pad stack" style={{ marginTop: 16 }} aria-label={t("listening.attributionTitle")}>
        <h2 style={{ fontSize: 16 }}>{t("listening.attributionTitle")}</h2>
        {source.attribution && <p style={{ margin: 0 }}>{t("listening.attribution")}: {source.attribution}</p>}
        {source.license && <p style={{ margin: 0 }}>{t("listening.license")}: {source.license}</p>}
        {lesson.sourceUrl && (
          <a href={lesson.sourceUrl} target="_blank" rel="noopener noreferrer">
            {t("listening.openOriginal")} →
          </a>
        )}
      </section>
    </div>
  );
}
