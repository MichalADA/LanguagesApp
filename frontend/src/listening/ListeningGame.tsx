import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n, useT } from "@/i18n";
import { AVAILABLE_LISTENING_LEVELS, loadListeningManifest } from "./loader";
import type { ListeningDialogue, ListeningLevel } from "./types";

const SPEEDS = [0.75, 1, 1.25] as const;

export function ListeningGame() {
  const t = useT();
  const { locale } = useI18n();
  const [selectedLevel, setSelectedLevel] = useState<ListeningLevel | null>(null);
  const [dialogues, setDialogues] = useState<ListeningDialogue[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const run = useRef(0);

  useEffect(() => {
    if (!selectedLevel) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    loadListeningManifest(selectedLevel, controller.signal).then(manifest => {
      if (controller.signal.aborted) return;
      setDialogues(manifest.dialogues);
      setSelectedId(manifest.dialogues[0]?.id ?? "");
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [selectedLevel]);

  const dialogue = useMemo(
    () => dialogues.find(item => item.id === selectedId) ?? dialogues[0],
    [dialogues, selectedId],
  );

  useEffect(() => () => {
    run.current += 1;
    audio.current?.pause();
  }, []);

  function stop() {
    run.current += 1;
    audio.current?.pause();
    setPlaying(false);
  }

  function reset(nextId: string) {
    stop();
    setSelectedId(nextId);
    setLineIndex(0);
    setAudioError(false);
    setShowTranscript(false);
    setAnswer("");
    setChecked(false);
  }

  function leaveLevel() {
    stop();
    setSelectedLevel(null);
    setDialogues([]);
    setSelectedId("");
    setLoadError(false);
    setLineIndex(0);
    setShowTranscript(false);
    setAnswer("");
    setChecked(false);
    setLoading(false);
  }

  function openLevel(level: ListeningLevel) {
    setLoading(true);
    setLoadError(false);
    setSelectedLevel(level);
  }

  function playLine(index: number, sequence = false, sequenceId = ++run.current) {
    if (!dialogue || !audio.current) return;
    const line = dialogue.lines[index];
    if (!line) {
      setPlaying(false);
      return;
    }
    setLineIndex(index);
    setAudioError(false);
    setPlaying(true);
    const player = audio.current;
    player.src = line.audioPath;
    player.playbackRate = speed;
    player.onended = () => {
      if (sequence && sequenceId === run.current && index + 1 < dialogue.lines.length) {
        playLine(index + 1, true, sequenceId);
      } else {
        setPlaying(false);
      }
    };
    void player.play().catch(() => {
      setPlaying(false);
      setAudioError(true);
    });
  }

  if (!selectedLevel) {
    return <section className="listening-levels stack">
      <div className="stack">
        <span className="eyebrow">{t("listening.chooseLevelEyebrow")}</span>
        <h2>{t("listening.chooseLevel")}</h2>
        <p className="muted">{t("listening.chooseLevelDescription")}</p>
      </div>
      <div className="grid grid-2 listening-level-grid">
        {AVAILABLE_LISTENING_LEVELS.map(level => <button key={level} className="panel panel-pad listening-level-card" onClick={() => openLevel(level)}>
          <span className="listening-level-mark">{level}</span>
          <span className="stack">
            <strong>{t(`listening.levels.${level}.name`)}</strong>
            <span className="muted">{t(`listening.levels.${level}.description`)}</span>
          </span>
          <span className="mode-card-action">{t("listening.openLevel")} →</span>
        </button>)}
      </div>
    </section>;
  }

  if (loading) return <div className="stack"><button className="btn-ghost listening-back" onClick={leaveLevel}>{t("listening.backToLevels")}</button><p role="status">{t("listening.loading")}</p></div>;
  if (loadError || !dialogue) {
    return <div className="stack"><button className="btn-ghost listening-back" onClick={leaveLevel}>{t("listening.backToLevels")}</button><div className="panel panel-pad"><p role="alert">{t("listening.loadError")}</p></div></div>;
  }
  const correct = answer === dialogue.question.correctOptionId;

  return <div className="listening-session stack">
    <audio ref={audio} preload="none" onError={() => {
      setPlaying(false);
      setAudioError(true);
    }} />

    <div><button className="btn-ghost listening-back" onClick={leaveLevel}>{t("listening.backToLevels")}</button></div>

    <section className="panel panel-pad listening-toolbar stack">
      <div className="row listening-heading">
        <div className="stack listening-title">
          <span className="eyebrow">{dialogue.level} · {dialogue.topic}</span>
          <h2>{locale === "en" ? dialogue.titleEn : dialogue.titlePl}</h2>
        </div>
        <label className="stack listening-select-label">
          <span className="mono dim">{t("listening.choose")}</span>
          <select value={dialogue.id} onChange={event => reset(event.target.value)}>
            {dialogues.map(item => <option key={item.id} value={item.id}>
              {item.level} · {locale === "en" ? item.titleEn : item.titlePl}
            </option>)}
          </select>
        </label>
      </div>
      <div className="row listening-controls">
        <button className="btn" onClick={() => playing ? stop() : playLine(0, true)}>
          {t(playing ? "listening.stop" : "listening.playAll")}
        </button>
        <label className="row listening-speed">{t("listening.speed")}
          <select value={speed} onChange={event => setSpeed(Number(event.target.value) as (typeof SPEEDS)[number])}>
            {SPEEDS.map(value => <option key={value} value={value}>{value}×</option>)}
          </select>
        </label>
        <span className="mono dim">{t("listening.line", { n: lineIndex + 1, total: dialogue.lines.length })}</span>
      </div>
      {audioError && <p role="alert" className="listening-error">{t("listening.audioError")}</p>}
    </section>

    <section className="panel panel-pad stack">
      <div className="row listening-section-head">
        <h2>{t("listening.transcript")}</h2>
        <button className="btn-ghost" onClick={() => setShowTranscript(value => !value)}>
          {t(showTranscript ? "listening.hide" : "listening.show")}
        </button>
      </div>
      {!showTranscript ? <p className="muted">{t("listening.listenFirst")}</p> : <div className="listening-lines">
        {dialogue.lines.map((line, index) => <article key={`${dialogue.id}-${index}`} className={`listening-line${lineIndex === index && playing ? " active" : ""}`}>
          <button className="listening-line-play" aria-label={t("listening.playLine", { n: index + 1 })} onClick={() => playLine(index)}>▶</button>
          <div className="stack">
            <span className="eyebrow">{line.speaker === "ana" ? "Ana" : "Marko"}</span>
            <strong lang="hr">{line.textHr}</strong>
            <span className="muted" lang="pl">{line.textPl}</span>
          </div>
        </article>)}
      </div>}
    </section>

    <section className="panel panel-pad stack listening-question">
      <span className="eyebrow">{t("listening.question")}</span>
      <h2>{dialogue.question.promptPl}</h2>
      <div className="listening-options">
        {dialogue.question.options.map(option => <label key={option.id} className={`listening-option${answer === option.id ? " selected" : ""}`}>
          <input type="radio" name={`answer-${dialogue.id}`} value={option.id} checked={answer === option.id} onChange={() => {
            setAnswer(option.id);
            setChecked(false);
          }} />
          <span>{option.textPl}</span>
        </label>)}
      </div>
      <div className="row">
        <button className="btn" disabled={!answer} onClick={() => setChecked(true)}>{t("listening.check")}</button>
        {checked && <strong role="status" className={correct ? "listening-good" : "listening-bad"}>
          {t(correct ? "listening.correct" : "listening.wrong")}
        </strong>}
      </div>
    </section>

    <p className="stat-note">{t("listening.pilotNote")}</p>
  </div>;
}
