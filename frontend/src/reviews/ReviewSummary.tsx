import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useCourse } from "@/courses/CourseProvider";
import { useT } from "@/i18n";
import { fetchReviewStats, type ReviewStats } from "./api";
export function ReviewSummary({ details = false }: { details?: boolean }) {
  const { status, apiRequest, user } = useAuth(),
    { course } = useCourse(),
    t = useT();
  const key = `${user?.id}:${course.id}`;
  const [data, setData] = useState<{ key: string; stats: ReviewStats } | null>(
      null,
    ),
    [error, setError] = useState<string | null>(null),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    setError(null);
    fetchReviewStats(apiRequest, course.id)
      .then((stats) => {
        if (alive) setData({ key, stats });
      })
      .catch(() => {
        if (alive) setError(key);
      });
    return () => {
      alive = false;
    };
  }, [status, apiRequest, course.id, key, retry]);
  if (status !== "authenticated") return null;
  const stats = data?.key === key ? data.stats : null;
  return (
    <section className="panel panel-pad stack">
      <div className="dashboard-section-head">
        <div>
          <span className="eyebrow">{t("reviews.due")}</span>
          <h2>{error === key ? "—" : (stats?.due ?? "…")}</h2>
        </div>
        <Link className="btn" to="/powtorki">
          {t("reviews.start")}
        </Link>
      </div>
      {error === key && (
        <div role="alert">
          <p>{t("reviews.error")}</p>
          <button className="btn-ghost" onClick={() => setRetry((n) => n + 1)}>
            {t("reviews.retry")}
          </button>
        </div>
      )}
      {details && stats && error !== key && (
        <>
          <p>
            {t("reviews.accuracy7")}:{" "}
            {stats.accuracy7 === null ? "—" : `${stats.accuracy7}%`}
          </p>
          <p>
            {t("reviews.accuracy30")}:{" "}
            {stats.accuracy30 === null ? "—" : `${stats.accuracy30}%`}
          </p>
          <p className="stat-note">{t("reviews.statsNote")}</p>
        </>
      )}
    </section>
  );
}
