import { Link } from "react-router-dom";
import { useUser, initialsOf } from "@/user/UserProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { summarize } from "@/progress/service";
import { useI18n } from "@/i18n";

export function ProfilePage() {
  const { t, locale } = useI18n();
  const { user, rename, signOut } = useUser();
  const { course } = useCourse();
  const { state, current, courseId } = useProgress();
  const summary = summarize(state, courseId);

  const since = new Date(user.since).toLocaleDateString(locale === "pl" ? "pl-PL" : "en-GB");

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("profile.eyebrow")}</span>
        <h1>{t("profile.title")}</h1>
      </header>

      <section className="panel panel-pad profile-card">
        <span className="avatar big" aria-hidden="true">
          {initialsOf(user.displayName)}
        </span>
        <div className="stack" style={{ gap: 10, flex: 1, minWidth: 0 }}>
          <label className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">{t("profile.displayName")}</span>
            <input
              className="login-input"
              value={user.displayName}
              onChange={(e) => rename(e.target.value)}
              maxLength={40}
            />
          </label>
          <div className="row" style={{ gap: 18 }}>
            <span className="mono dim" style={{ fontSize: 12 }}>
              {t("profile.status")}: {user.authenticated ? (user.email ?? "—") : t("user.guest")}
            </span>
            <span className="mono dim" style={{ fontSize: 12 }}>
              {t("profile.memberSince")}: {since}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-3">
        <div className="panel stat">
          <span className="stat-value">{course.flag}</span>
          <span className="stat-label">{t("course.active")}</span>
          <span className="stat-note">{course.name[locale]}</span>
        </div>
        <div className="panel stat">
          <span className="stat-value">{summary.seen}</span>
          <span className="stat-label">{t("profile.totalWords")}</span>
          <span className="stat-note">{t("dashboard.learned")}: {summary.learned}</span>
        </div>
        <div className="panel stat">
          <span className="stat-value">{current.totalAttempts}</span>
          <span className="stat-label">{t("stats.attempts")}</span>
          <span className="stat-note">
            {t("dashboard.accuracy")}: {summary.accuracy}%
          </span>
        </div>
      </section>

      <p className="stat-note">{t("profile.demoNote")}</p>

      <div className="row" style={{ gap: 10 }}>
        {user.authenticated ? (
          <button type="button" className="btn-ghost btn-danger" onClick={signOut}>
            {t("auth.logout")}
          </button>
        ) : (
          <Link to="/login" className="btn">
            {t("auth.login")}
          </Link>
        )}
        <Link to="/jezyki" className="btn-ghost">
          {t("user.myLanguages")}
        </Link>
      </div>
    </div>
  );
}
