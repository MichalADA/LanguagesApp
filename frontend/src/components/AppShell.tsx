import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useT } from "@/i18n";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { Logo } from "./Logo";
import { Topbar } from "./Topbar";

interface NavItem {
  to: string;
  key: string;
  glyph: string;
  end?: boolean;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", key: "nav.dashboard", glyph: "◆", end: true },
  { to: "/gry", key: "nav.games", glyph: "▶" },
  { to: "/powtorki", key: "nav.review", glyph: "↻" },
  { to: "/fiszki", key: "nav.flashcards", glyph: "❑", soon: true },
  { to: "/statystyki", key: "nav.stats", glyph: "▤" },
  { to: "/postep", key: "nav.progress", glyph: "▰" },
  { to: "/jezyki", key: "nav.courses", glyph: "⚑" },
  { to: "/ustawienia", key: "nav.settings", glyph: "⚙" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const { entries, error } = useVocabulary();

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <Logo />
          <span className="eyebrow" style={{ marginLeft: 36 }}>
            {t("app.tagline")}
          </span>
        </NavLink>

        <nav className="nav">
          {NAV.map((item) =>
            item.soon ? (
              <span key={item.to} className="nav-link nav-soon" aria-disabled="true">
                <span className="nav-glyph">{item.glyph}</span>
                <span className="nav-label">{t(item.key)}</span>
                <span className="nav-badge">{t("common.soon")}</span>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                <span className="nav-glyph">{item.glyph}</span>
                <span className="nav-label">{t(item.key)}</span>
              </NavLink>
            ),
          )}
        </nav>

        <div className="sidebar-foot dim">
          {error ? (
            <span style={{ color: "var(--bad)" }}>{error}</span>
          ) : (
            <>
              {entries.length || "…"} {t("common.words")}
              <br />
              {t("user.localProfile")}
            </>
          )}
        </div>
      </aside>

      <div className="content">
        <Topbar />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
