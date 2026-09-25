import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useT } from "@/i18n";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useAuth } from "@/auth/useAuth";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { Topbar } from "./Topbar";

interface NavItem {
  to: string;
  key: string;
  icon: IconName;
  end?: boolean;
  soon?: boolean;
  /** Na telefonie: dolna zakładka zamiast pozycji w arkuszu „Więcej”. */
  tab?: boolean;
}

/** Nauka na górze (kurs jako główna ścieżka, potem trening), wgląd w postęp niżej, konfiguracja przypięta do dołu. */
const NAV_GROUPS: NavItem[][] = [
  [
    { to: "/", key: "nav.dashboard", icon: "home", end: true, tab: true },
    { to: "/kurs", key: "nav.course", icon: "route", tab: true },
    { to: "/powtorki", key: "nav.review", icon: "repeat", tab: true },
    { to: "/fiszki", key: "nav.flashcards", icon: "cards", tab: true },
    { to: "/gry", key: "nav.games", icon: "play" },
  ],
  [
    { to: "/postep", key: "nav.progress", icon: "trend" },
    { to: "/statystyki", key: "nav.stats", icon: "chart" },
    { to: "/jezyki", key: "nav.courses", icon: "globe" },
  ],
];

const SETTINGS: NavItem = { to: "/ustawienia", key: "nav.settings", icon: "settings" };

const MOBILE_ITEMS = [...NAV_GROUPS.flat(), SETTINGS].filter((item) => !item.soon);
const MOBILE_TABS = MOBILE_ITEMS.filter((item) => item.tab);
const MOBILE_MORE = MOBILE_ITEMS.filter((item) => !item.tab);

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const { entries, error } = useVocabulary();
  const { status } = useAuth();

  const renderItem = (item: NavItem) =>
    item.soon ? (
      <span key={item.to} className="nav-link nav-soon" aria-disabled="true">
        <Icon name={item.icon} />
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
        <Icon name={item.icon} />
        <span className="nav-label">{t(item.key)}</span>
      </NavLink>
    );

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand" aria-label="Lexodromia">
          <Logo size={30} />
          <span className="brand-tagline">{t("app.tagline")}</span>
        </NavLink>

        <nav className="nav">
          {NAV_GROUPS.map((group, index) => (
            <div className="nav-group" key={index}>
              {group.map(renderItem)}
            </div>
          ))}
          <div className="nav-group nav-group-end">{renderItem(SETTINGS)}</div>
        </nav>

        <div className="sidebar-foot">
          {error ? (
            <span className="sidebar-error">{error}</span>
          ) : (
            <>
              <span>
                {entries.length || "…"} {t("common.words")}
              </span>
              <span>
                {t(status === "authenticated" ? "user.accountProfile" : "user.localProfile")}
              </span>
            </>
          )}
        </div>
      </aside>

      <div className="content">
        <Topbar />
        <main className="main">{children}</main>
      </div>
      <MobileNav tabs={MOBILE_TABS} more={MOBILE_MORE} />
    </div>
  );
}
