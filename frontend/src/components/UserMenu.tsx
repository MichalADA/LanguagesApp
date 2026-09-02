import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser, initialsOf } from "@/user/UserProvider";
import { useT } from "@/i18n";

export function UserMenu() {
  const t = useT();
  const navigate = useNavigate();
  const { user, signOut } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className="usermenu" ref={ref}>
      <button
        type="button"
        className="usermenu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="avatar" aria-hidden="true">
          {initialsOf(user.displayName)}
        </span>
        <span className="usermenu-name">
          <span className="usermenu-display">{user.displayName}</span>
          <span className="usermenu-status">
            {user.authenticated ? (user.email ?? "") : t("user.notLoggedIn")}
          </span>
        </span>
        <span className="usermenu-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="usermenu-panel" role="menu">
          <button type="button" role="menuitem" onClick={() => go("/profil")}>
            {t("nav.profile")}
          </button>
          <button type="button" role="menuitem" onClick={() => go("/jezyki")}>
            {t("user.myLanguages")}
          </button>
          <button type="button" role="menuitem" onClick={() => go("/ustawienia")}>
            {t("nav.settings")}
          </button>
          <div className="usermenu-sep" />
          {user.authenticated ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                signOut();
                setOpen(false);
              }}
            >
              {t("auth.logout")}
            </button>
          ) : (
            <Link to="/login" role="menuitem" onClick={() => setOpen(false)}>
              {t("auth.login")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
