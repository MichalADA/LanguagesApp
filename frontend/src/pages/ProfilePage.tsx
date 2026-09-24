import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { initialsOf } from "@/auth/types";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { summarize } from "@/progress/service";
import { useI18n } from "@/i18n";

export function ProfilePage() {
  const { t, locale } = useI18n();
  const { user, status, updateDisplayName, logout } = useAuth();
  const navigate = useNavigate();
  const { course } = useCourse();
  const { state, current, courseId } = useProgress();
  const summary = summarize(state, courseId);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => setDisplayName(user?.displayName ?? ""), [user?.displayName]);

  if (!user) return null;

  const since = new Date(user.since).toLocaleDateString(locale === "pl" ? "pl-PL" : "en-GB");

  const saveDisplayName = async () => {
    if (!displayName.trim() || displayName.trim() === user.displayName) return;
    setProfileError(null);
    try {
      await updateDisplayName(displayName);
    } catch {
      setDisplayName(user.displayName);
      setProfileError(t("profile.updateError"));
    }
  };

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
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => void saveDisplayName()}
              maxLength={80}
            />
          </label>
          <div className="row" style={{ gap: 18 }}>
            <span className="mono dim" style={{ fontSize: 12 }}>
              {t("profile.status")}: {status === "authenticated" ? (user.email ?? "—") : t("user.guest")}
            </span>
            <span className="mono dim" style={{ fontSize: 12 }}>
              {t("profile.memberSince")}: {since}
            </span>
          </div>
        </div>
      </section>
      {profileError && <p className="form-message error" role="alert">{profileError}</p>}

      <section className="stat-grid">
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

      <p className="stat-note">
        {t(status === "authenticated" ? "profile.accountNote" : "profile.guestNote")}
      </p>

      <div className="row" style={{ gap: 10 }}>
        {status === "authenticated" ? (
          <button
            type="button"
            className="btn-ghost btn-danger"
            onClick={() => void logout().then(() => navigate("/login", { replace: true }))}
          >
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
