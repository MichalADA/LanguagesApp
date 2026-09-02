import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { AuthApiError } from "@/auth/authApi";
import { useAuth } from "@/auth/useAuth";
import { useI18n } from "@/i18n";

type View = "login" | "register";

export function LoginPage() {
  const { t } = useI18n();
  const {
    login,
    register,
    continueAsGuest,
    sessionError,
    clearSessionError,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const destination =
    typeof (location.state as { from?: unknown } | null)?.from === "string"
      ? (location.state as { from: string }).from
      : "/";

  const changeView = (next: View) => {
    setView(next);
    setError(null);
    setNotice(null);
    clearSessionError();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    clearSessionError();

    if (!email.trim() || !password || (view === "register" && !displayName.trim())) {
      setError(t("auth.requiredFields"));
      return;
    }
    if (view === "register" && password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (view === "register" && password !== passwordConfirmation) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      if (view === "register") {
        await register({ email: email.trim(), displayName: displayName.trim(), password });
      } else {
        await login({ email: email.trim(), password });
      }
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(messageFor(caught, view, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="stack" style={{ gap: 8, alignItems: "center", textAlign: "center" }}>
          <Logo size={34} />
          <h1 style={{ fontSize: 26, marginTop: 10 }}>
            {t(view === "login" ? "auth.title" : "auth.registerTitle")}
          </h1>
          <p className="muted" style={{ fontSize: 15 }}>
            {t(view === "login" ? "auth.subtitle" : "auth.registerSubtitle")}
          </p>
        </div>

        <form className="stack" style={{ gap: 14 }} onSubmit={onSubmit}>
          {view === "register" && (
            <label className="login-label">
              {t("auth.displayName")}
              <input
                type="text"
                className="login-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                maxLength={80}
                required
                disabled={submitting}
              />
            </label>
          )}

          <label className="login-label">
            {t("auth.email")}
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="michal@example.com"
              autoComplete="email"
              maxLength={254}
              required
              disabled={submitting}
            />
          </label>

          <label className="login-label">
            {t("auth.password")}
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={view === "login" ? "current-password" : "new-password"}
              minLength={view === "register" ? 8 : 1}
              maxLength={200}
              required
              disabled={submitting}
            />
          </label>

          {view === "register" && (
            <label className="login-label">
              {t("auth.confirmPassword")}
              <input
                type="password"
                className="login-input"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                maxLength={200}
                required
                disabled={submitting}
              />
            </label>
          )}

          {(error || sessionError) && (
            <p className="form-message error" role="alert">
              {error ?? sessionError}
            </p>
          )}
          {notice && (
            <p className="form-message" role="status">
              {notice}
            </p>
          )}

          <button type="submit" className="btn" style={{ width: "100%" }} disabled={submitting}>
            {submitting
              ? t(view === "login" ? "auth.loginPending" : "auth.registerPending")
              : t(view === "login" ? "auth.login" : "auth.createAccount")}
          </button>

          <div className="row" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="linklike"
              onClick={() => changeView(view === "login" ? "register" : "login")}
              disabled={submitting}
            >
              {t(view === "login" ? "auth.signup" : "auth.backToLogin")}
            </button>
            {view === "login" && (
              <button
                type="button"
                className="linklike"
                onClick={() => {
                  setError(null);
                  setNotice(t("auth.forgotSoon"));
                }}
                disabled={submitting}
              >
                {t("auth.forgot")}
              </button>
            )}
          </div>
        </form>

        <div className="login-divider">
          <span>{t("auth.orContinue")}</span>
        </div>

        <button
          type="button"
          className="btn-ghost"
          style={{ textAlign: "center" }}
          disabled={submitting}
          onClick={() => {
            continueAsGuest();
            navigate("/", { replace: true });
          }}
        >
          {t("auth.guestCta")}
        </button>

        <p className="login-note">{t("auth.demoNote")}</p>
      </div>
    </div>
  );
}

function messageFor(error: unknown, view: View, t: (key: string) => string): string {
  if (!(error instanceof AuthApiError)) return t("auth.unexpectedError");
  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return t("auth.invalidCredentials");
    case "EMAIL_TAKEN":
      return t("auth.emailTaken");
    case "VALIDATION":
      return t(view === "register" ? "auth.registrationValidation" : "auth.validationError");
    case "RATE_LIMITED":
      return t("auth.rateLimited");
    case "NETWORK":
      return t("auth.backendUnavailable");
    case "SESSION_EXPIRED":
      return t("auth.sessionExpired");
    case "SERVER":
    default:
      return t("auth.unexpectedError");
  }
}
