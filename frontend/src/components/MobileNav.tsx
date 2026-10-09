import { useEffect, useRef, useState } from "react";
import { NavLink, matchPath, useLocation } from "react-router-dom";
import { useT } from "@/i18n";
import { Icon, type IconName } from "./Icon";

export interface MobileNavItem {
  to: string;
  key: string;
  icon: IconName;
  end?: boolean;
}

/**
 * Nawigacja na telefonie (≤900 px, patrz styles.css): najczęstsze cele jako
 * dolne zakładki w zasięgu kciuka, reszta w arkuszu „Więcej”.
 * Na desktopie całość jest ukryta — tam nawigacją zostaje sidebar.
 */
export function MobileNav({ tabs, more }: { tabs: MobileNavItem[]; more: MobileNavItem[] }) {
  const t = useT();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreActive = more.some((item) => matchPath({ path: item.to, end: item.end ?? false }, pathname));

  // Arkusz zamyka się po każdej nawigacji (także „wstecz” w przeglądarce).
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onEsc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const link = (item: MobileNavItem, className: string) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => (isActive ? `${className} active` : className)}
    >
      <Icon name={item.icon} size={className === "tab" ? 22 : 20} />
      <span className="tab-label">{t(item.key)}</span>
    </NavLink>
  );

  return (
    <>
      <nav className="tabbar" aria-label={t("nav.mobileLabel")}>
        {tabs.map((item) => link(item, "tab"))}
        <button
          type="button"
          className={moreActive || open ? "tab active" : "tab"}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name="grid" size={22} />
          <span className="tab-label">{t("nav.more")}</span>
        </button>
      </nav>

      {open && (
        <>
          <div className="sheet-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t("nav.more")} ref={sheetRef}>
            <div className="sheet-head">
              <span className="sheet-title">{t("nav.more")}</span>
              <button type="button" className="sheet-close" onClick={() => setOpen(false)} aria-label={t("nav.close")}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="sheet-list">{more.map((item) => link(item, "sheet-link"))}</div>
          </div>
        </>
      )}
    </>
  );
}
