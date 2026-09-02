import { useState } from "react";
import type { ReactNode } from "react";
import { useProgress } from "@/progress/ProgressProvider";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useI18n, UI_LOCALES } from "@/i18n";
import type { UiLocale } from "@/i18n/types";

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { state, updateSettings, reset, storageKey } = useProgress();
  const { entries, datasetUrl } = useVocabulary();
  const [confirming, setConfirming] = useState(false);
  const s = state.settings;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ ...state, uiLocale: locale }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lexodromia-postep.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("settings.eyebrow")}</span>
        <h1>{t("settings.title")}</h1>
      </header>

      <section className="panel panel-pad stack" style={{ gap: 18 }}>
        <h2 style={{ fontSize: 18 }}>{t("settings.interface")}</h2>
        <Row label={t("settings.uiLanguage")} value={t("settings.uiLanguageNote")}>
          <div className="row" style={{ gap: 8 }}>
            {UI_LOCALES.map((l) => (
              <button
                key={l.id}
                type="button"
                className={locale === l.id ? "chip on" : "chip"}
                onClick={() => setLocale(l.id as UiLocale)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </Row>
      </section>

      <section className="panel panel-pad stack" style={{ gap: 20 }}>
        <h2 style={{ fontSize: 18 }}>{t("settings.gameplay")}</h2>

        <Row label={t("settings.timeLimit")} value={t("settings.seconds", { n: s.timeLimit })}>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={s.timeLimit}
            onChange={(e) => updateSettings({ timeLimit: Number(e.target.value) })}
          />
        </Row>

        <Row label={t("settings.lives")} value={String(s.lives)}>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={s.lives}
            onChange={(e) => updateSettings({ lives: Number(e.target.value) })}
          />
        </Row>

        <Row label={t("settings.roundLength")} value={t("settings.wordsCount", { n: s.roundLength })}>
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={s.roundLength}
            onChange={(e) => updateSettings({ roundLength: Number(e.target.value) })}
          />
        </Row>

        <Row
          label={t("settings.lenient")}
          value={s.lenientDiacritics ? t("settings.lenientOn") : t("settings.lenientOff")}
        >
          <button
            type="button"
            className={s.lenientDiacritics ? "chip on" : "chip"}
            onClick={() => updateSettings({ lenientDiacritics: !s.lenientDiacritics })}
          >
            {s.lenientDiacritics ? t("settings.on") : t("settings.off")}
          </button>
        </Row>
      </section>

      <section className="panel panel-pad stack" style={{ gap: 14 }}>
        <h2 style={{ fontSize: 18 }}>{t("settings.data")}</h2>
        <div className="list">
          <div className="list-row">
            <span className="muted">{t("settings.deck")}</span>
            <span className="mono dim" style={{ fontSize: 13 }}>
              {entries.length} · {datasetUrl}
            </span>
          </div>
          <div className="list-row">
            <span className="muted">{t("settings.progressKey")}</span>
            <span className="mono dim" style={{ fontSize: 13 }}>
              localStorage · {storageKey ?? "—"}
            </span>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn-ghost" onClick={exportJson}>
            {t("settings.export")}
          </button>
          {confirming ? (
            <>
              <button
                type="button"
                className="btn-ghost btn-danger"
                onClick={() => {
                  reset();
                  setConfirming(false);
                }}
              >
                {t("settings.resetConfirm")}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
                {t("common.cancel")}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-ghost btn-danger"
              onClick={() => setConfirming(true)}
            >
              {t("settings.reset")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="stack" style={{ gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
        <span className="mono dim" style={{ fontSize: 12 }}>
          {value}
        </span>
      </div>
      {children}
    </div>
  );
}
