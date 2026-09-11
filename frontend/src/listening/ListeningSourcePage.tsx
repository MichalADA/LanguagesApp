import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useT } from "@/i18n";
import { fetchSourceWithUnits } from "./api";
import type { ListeningSourceWithUnits, ListeningUnit } from "./types";

type UnitGroups = Map<string, ListeningUnit[]>;

function groupByLevel(units: ListeningUnit[]): UnitGroups {
  const map = new Map<string, ListeningUnit[]>();
  for (const unit of units) {
    const key = unit.level ?? "";
    const bucket = map.get(key) ?? [];
    bucket.push(unit);
    map.set(key, bucket);
  }
  for (const bucket of map.values()) bucket.sort((a, b) => a.position - b.position);
  return map;
}

export function ListeningSourcePage() {
  const t = useT();
  const { slug = "" } = useParams();
  const [data, setData] = useState<ListeningSourceWithUnits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchSourceWithUnits(slug, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) setData(payload);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("listening.loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, t]);

  const grouped = useMemo<UnitGroups>(() => (data ? groupByLevel(data.units) : new Map()), [data]);

  if (loading) return <div className="page"><p role="status">{t("common.loading")}</p></div>;
  if (error || !data) return <div className="page"><p role="alert">{error ?? t("listening.loadError")}</p></div>;

  const { source } = data;
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("listening.eyebrow")}</span>
        <h1>{source.name}</h1>
        {source.description && <p className="lede">{source.description}</p>}
        <Link className="mono dim" to="/listening">{t("listening.backToHub")}</Link>
      </header>

      {[...grouped.entries()].map(([level, units]) => (
        <section key={level} className="stack" style={{ marginTop: 16 }}>
          <h2>{level || t("listening.levelUnnamed")}</h2>
          <div className="grid grid-3">
            {units.map((unit) => (
              <article key={unit.id} className="panel panel-pad game-card">
                <h3 style={{ fontSize: 18 }}>{unit.title}</h3>
                <ul className="stack" style={{ paddingLeft: 16, listStyle: "disc" }}>
                  {unit.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link to={`/listening/${source.slug}/lessons/${lesson.id}`}>
                        {lesson.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}

      {source.attribution && (
        <p className="stat-note">
          {t("listening.attribution")}: {source.attribution}
          {source.sourceUrl && (
            <> · <a href={source.sourceUrl} target="_blank" rel="noreferrer">{t("listening.openOriginal")}</a></>
          )}
        </p>
      )}
    </div>
  );
}
