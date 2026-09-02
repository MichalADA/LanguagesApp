import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PoolSelection } from "@/progress/types";
import type { VocabularyEntry } from "@/vocabulary/types";
import type { Verdict } from "@/services/validation";
import type { AnsweredWord } from "@/progress/service";
import { checkAnswer, maskedHint } from "@/services/validation";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useWordPool, DEFAULT_POOL } from "@/hooks/useWordPool";
import { PoolPicker } from "@/components/PoolPicker";
import { AnswerInput } from "@/components/AnswerInput";
import { useI18n } from "@/i18n";
import { sample } from "@/utils/random";
import { BURA_ID, HINT_COST, multiplierFor, pointsFor } from "./logic";

type Phase = "menu" | "playing" | "over";

/**
 * Bura — mechanika bez zmian względem pierwszej wersji: zegar, trzy życia,
 * mnożnik co pięć trafień, podpowiedź za punkty, ekran końca z listą powtórek.
 * Zmieniło się tylko to, skąd bierze dane: aktywny kurs, wspólna walidacja,
 * wspólny WordProgress i wspólny pasek znaków specjalnych.
 */
export function BuraGame() {
  const { t, locale } = useI18n();
  const { course } = useCourse();
  const { loading } = useVocabulary();
  const { state, current, recordRound, rememberActivity } = useProgress();
  const settings = state.settings;

  const [selection, setSelection] = useState<PoolSelection>(
    current.lastActivity?.gameId === BURA_ID ? current.lastActivity.pool : DEFAULT_POOL,
  );
  const pool = useWordPool(selection);

  const [phase, setPhase] = useState<Phase>("menu");
  const [queue, setQueue] = useState<VocabularyEntry[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(settings.lives);
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hintText, setHintText] = useState("");
  const [timeLeft, setTimeLeft] = useState(1);
  const [answered, setAnswered] = useState<AnsweredWord[]>([]);

  const deadline = useRef(0);
  const limitMs = settings.timeLimit * 1000;
  const entry = queue[idx];
  const record = current.games[BURA_ID];

  const arm = useCallback(() => {
    deadline.current = Date.now() + limitMs;
    setTimeLeft(1);
  }, [limitMs]);

  const judge = useCallback(
    (input: string | null) => {
      const target = queue[idx];
      if (!target || verdict) return;
      const { verdict: v } = checkAnswer(course, target, input, {
        lenient: settings.lenientDiacritics,
      });
      setVerdict(v);
      setAnswered((prev) => [...prev, { entry: target, verdict: v }]);
      if (v === "miss") {
        setStreak(0);
        setLives((l) => l - 1);
      } else {
        const nextStreak = streak + 1;
        setScore((s) => s + pointsFor(v, streak));
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
      }
    },
    [queue, idx, verdict, course, settings.lenientDiacritics, streak],
  );

  useEffect(() => {
    if (phase !== "playing" || verdict) return;
    const timer = setInterval(() => {
      const left = Math.max(0, (deadline.current - Date.now()) / limitMs);
      if (left <= 0) judge(null);
      else setTimeLeft(left);
    }, 60);
    return () => clearInterval(timer);
  }, [phase, verdict, limitMs, judge]);

  const finish = useCallback(() => {
    recordRound({
      gameId: BURA_ID,
      score,
      bestStreak,
      answered,
      activity: { gameId: BURA_ID, pool: selection, at: Date.now() },
    });
    setPhase("over");
  }, [recordRound, score, bestStreak, answered, selection]);

  const next = useCallback(() => {
    if (lives <= 0 || idx >= queue.length - 1) {
      finish();
      return;
    }
    setIdx((i) => i + 1);
    setTyped("");
    setVerdict(null);
    setHintText("");
    arm();
  }, [lives, idx, queue.length, finish, arm]);

  const start = useCallback(() => {
    if (pool.length === 0) return;
    rememberActivity(BURA_ID, selection);
    setQueue(sample(pool, settings.roundLength));
    setIdx(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setLives(settings.lives);
    setTyped("");
    setVerdict(null);
    setHintText("");
    setAnswered([]);
    setPhase("playing");
    arm();
  }, [pool, selection, rememberActivity, settings.roundLength, settings.lives, arm]);

  useEffect(() => {
    if (phase !== "playing" || !verdict) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, verdict, next]);

  const mistakes = useMemo(
    () => answered.filter((a) => a.verdict === "miss").map((a) => a.entry),
    [answered],
  );

  if (loading) return <span className="loading">{t("common.loading")}</span>;

  if (phase === "menu") {
    return (
      <div className="stack" style={{ gap: 24 }}>
        <PoolPicker value={selection} onChange={setSelection} poolSize={pool.length} />
        <div className="row" style={{ gap: 16 }}>
          <button type="button" className="btn" onClick={start} disabled={pool.length === 0}>
            {t("common.start")}
          </button>
          <span className="stat-note">
            {t("game.rules.roundInfo", {
              round: settings.roundLength,
              lives: settings.lives,
              time: settings.timeLimit,
            })}
          </span>
        </div>

        <div className="grid grid-3 rules">
          <Rule title={t("game.rules.lives", { n: settings.lives })}>
            {t("game.rules.livesNote")}
          </Rule>
          <Rule title={t("game.rules.combo")}>{t("game.rules.comboNote")}</Rule>
          <Rule title={t("game.rules.almost")}>
            {settings.lenientDiacritics ? t("game.rules.almostOn") : t("game.rules.almostOff")}
          </Rule>
        </div>
      </div>
    );
  }

  if (phase === "over") {
    return (
      <div className="stack" style={{ gap: 22 }}>
        <div className="panel result-card">
          <span className="eyebrow">{t("game.roundEnd")}</span>
          <span className="result-score">{score}</span>
          <span className="muted" style={{ fontSize: 16 }}>
            {t("game.bestStreak", { n: bestStreak })} · {t("game.mistakes", { n: mistakes.length })}
          </span>
          <span className="mono dim" style={{ fontSize: 14 }}>
            {t("game.record", { n: record?.bestScore ?? score })}
          </span>
          <div className="row" style={{ marginTop: 16, gap: 10, justifyContent: "center" }}>
            <button type="button" className="btn" onClick={start}>
              {t("game.again")}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPhase("menu")}>
              {t("game.changePool")}
            </button>
          </div>
        </div>

        {mistakes.length > 0 && (
          <div className="stack" style={{ gap: 10 }}>
            <span className="eyebrow">{t("game.toReview")}</span>
            <div className="list">
              {mistakes.map((m) => (
                <div key={m.id} className="list-row">
                  <span className="muted" style={{ fontSize: 16 }}>
                    {m.sourceText}
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 600, color: "var(--accent-text)" }}>
                    {m.targetText}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const multiplier = multiplierFor(streak);
  const timeColor =
    timeLeft > 0.5 ? "var(--accent-hover)" : timeLeft > 0.22 ? "var(--warn)" : "var(--bad)";
  const verdictText =
    verdict === "hit"
      ? t("game.correct")
      : verdict === "near"
        ? t("game.almost")
        : typed
          ? t("game.wrong")
          : t("game.timeUp");
  const verdictColor =
    verdict === "hit" ? "var(--good)" : verdict === "near" ? "var(--warn)" : "var(--bad)";

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="hud">
        <div className="row" style={{ gap: 20, alignItems: "baseline" }}>
          <span className="hud-score">{score}</span>
          <span className="dim">{t("common.points")}</span>
          <span style={{ color: multiplier > 1 ? "var(--gold-light)" : "var(--dim)" }}>
            ×{multiplier} · {t("game.streak", { n: streak })}
          </span>
        </div>
        <div className="row" style={{ gap: 16 }}>
          <span className="dim">
            {idx + 1} / {queue.length}
          </span>
          <span className="hearts">
            {"♥".repeat(Math.max(0, lives)) + "♡".repeat(Math.max(0, settings.lives - lives))}
          </span>
        </div>
      </div>

      <div className="bar">
        <span
          style={{
            width: `${(timeLeft * 100).toFixed(1)}%`,
            background: timeColor,
            transition: "width .06s linear",
          }}
        />
      </div>

      <div className="arena">
        <span className="eyebrow">{entry?.partOfSpeech}</span>
        <span className="prompt">{entry?.sourceText}</span>

        {!verdict ? (
          <div className="stack" style={{ alignItems: "center", gap: 12, width: "100%" }}>
            <AnswerInput
              value={typed}
              onChange={setTyped}
              onSubmit={() => judge(typed)}
              placeholder={t("game.placeholder", { language: course.targetName[locale] })}
              characters={course.specialCharacters}
              focusKey={entry?.id}
            />
            <div className="row" style={{ gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                className="btn"
                style={{ padding: "10px 22px", fontSize: 14 }}
                onClick={() => judge(typed)}
              >
                {t("game.check")} ⏎
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  if (hintText || !entry) return;
                  setHintText(maskedHint(entry.targetText));
                  setScore((s) => Math.max(0, s - HINT_COST));
                }}
              >
                {t("game.hint")} −{HINT_COST}
              </button>
              <button type="button" className="btn-ghost btn-danger" onClick={() => judge(null)}>
                {t("game.giveUp")}
              </button>
            </div>
            {hintText && <span className="hint-text">{hintText}</span>}
          </div>
        ) : (
          <div className="stack" style={{ alignItems: "center", gap: 14, width: "100%" }}>
            <span className="eyebrow" style={{ color: verdictColor }}>
              {verdictText}
            </span>
            <span className="answer">{entry?.targetText}</span>
            <span className="muted" style={{ fontSize: 14 }}>
              {entry?.grammar}
            </span>
            <div className="example">
              <div className="example-hr">{entry?.exampleTarget}</div>
              <div className="example-pl">{entry?.exampleSource}</div>
            </div>
            {entry?.falseFriendNote && <div className="note-warn">⚠ {entry.falseFriendNote}</div>}
            <button type="button" className="btn" style={{ marginTop: 4 }} onClick={next}>
              {t("game.next")} ⏎
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Rule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rule">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
