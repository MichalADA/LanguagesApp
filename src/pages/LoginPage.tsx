import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useUser } from "@/user/UserProvider";
import { useI18n } from "@/i18n";

/**
 * Ekran logowania — wyłącznie warstwa wizualna.
 * ⬇ BACKEND PODŁĄCZASZ TUTAJ: w `onSubmit` zamiast `signIn(email)` wywołaj
 * POST /api/auth/login, a token przekaż do UserProvider. Hasło nie jest i nie
 * ma być nigdzie przechowywane.
 */
export function LoginPage() {
  const { t } = useI18n();
  const { signIn } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    signIn(email.trim());
    navigate("/");
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="stack" style={{ gap: 8, alignItems: "center", textAlign: "center" }}>
          <Logo size={34} />
          <h1 style={{ fontSize: 26, marginTop: 10 }}>{t("auth.title")}</h1>
          <p className="muted" style={{ fontSize: 15 }}>
            {t("auth.subtitle")}
          </p>
        </div>

        <form className="stack" style={{ gap: 14 }} onSubmit={onSubmit}>
          <label className="login-label">
            {t("auth.email")}
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="michal@example.com"
              autoComplete="email"
            />
          </label>

          <label className="login-label">
            {t("auth.password")}
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="btn" style={{ width: "100%" }}>
            {t("auth.login")}
          </button>

          <div className="row" style={{ justifyContent: "space-between" }}>
            <button type="button" className="linklike">
              {t("auth.signup")}
            </button>
            <button type="button" className="linklike">
              {t("auth.forgot")}
            </button>
          </div>
        </form>

        <div className="login-divider">
          <span>{t("auth.orContinue")}</span>
        </div>

        <Link to="/" className="btn-ghost" style={{ textAlign: "center" }}>
          {t("auth.guestCta")}
        </Link>

        <p className="login-note">{t("auth.demoNote")}</p>
      </div>
    </div>
  );
}
