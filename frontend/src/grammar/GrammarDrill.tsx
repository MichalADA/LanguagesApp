import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import { useCourse } from "@/courses/CourseProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { DEFAULT_POOL } from "@/hooks/useWordPool";
import { AnswerInput } from "@/components/AnswerInput";
import type { Verdict } from "@/services/validation";
import type { AnsweredForm } from "@/progress/service";
import { findDrillTopic, type DrillItem } from "./drills";
import { DRILL_HIT, DRILL_NEAR, correctAnswer, drillKey, judgeItem, pickRound, shuffled } from "./drillLogic";

type Phase = "menu" | "play" | "over";

interface Result {
  item: DrillItem;
  verdict: Verdict;
  given: string;
}

/**
 * Wspólna gra dla zestawów zadań gramatycznych (przypadki, szyk, aspekt, stopniowanie, czasy).
 * Runda: 10 zadań ważonych postępem; po każdym — ocena i wyjaśnienie reguły.
 * Wynik trafia do postępu tym samym kanałem co Odmiana (recordGrammarRound).
 */
export function GrammarDrill({ topicId }: { topicId: string }) {
  const t = useT();
  const { course } = useCourse();
  const { state, current, recordGrammarRound, rememberActivity } = useProgress();
  const topic = findDrillTopic(topicId);
  const [phase, setPhase] = useState<Phase>("menu");
  const [round, setRound] = useState<DrillItem[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [tiles, setTiles] = useState<string[]>([]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<Result | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [score, setScore] = useState(0);
  const [, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const saved = useRef(false);
  const item = round[index];
  const lenient = state.settings.lenientDiacritics;

  const prepare = useCallback((next: DrillItem | undefined) => {
    setTyped("");
    setPlaced([]);
    setOutcome(null);
    setTiles(next?.kind === "order" ? shuffled(next.tokens) : []);
  }, []);

  const start = useCallback(() => {
    if (!topic) return;
    const items = pickRound(topic.items, (id) => current.forms[drillKey(topic.id, id)]);
    setRound(items);
    setIndex(0);
    setResults([]);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    prepare(items[0]);
    saved.current = false;
    rememberActivity(topic.id, DEFAULT_POOL);
    setPhase("play");
  }, [topic, current.forms, prepare, rememberActivity]);

  const answer = useCallback(
    (value: string | number) => {
      if (!item || outcome) return;
      const verdict = judgeItem(item, value, course.validation, lenient);
      const given = typeof value === "number" && item.kind === "choice" ? item.options[value] : String(value);
      const result = { item, verdict, given };
      setOutcome(result);
      setResults((r) => [...r, result]);
      setScore((s) => s + (verdict === "hit" ? DRILL_HIT : verdict === "near" ? DRILL_NEAR : 0));
      const ok = verdict !== "miss";
      setStreak((s) => {
        const next = ok ? s + 1 : 0;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    },
    [item, outcome, course.validation, lenient],
  );

  const next = useCallback(() => {
    if (index + 1 >= round.length) {
      setPhase("over");
      return;
    }
    setIndex(index + 1);
    prepare(round[index + 1]);
  }, [index, round, prepare]);

  // Zapis rundy raz, na ekranie wyniku.
  useEffect(() => {
    if (phase !== "over" || saved.current || !topic) return;
    saved.current = true;
    const answered: AnsweredForm[] = results.map((r) => ({
      key: drillKey(topic.id, r.item.id),
      verbId: `drill:${topic.id}`,
      person: topic.id,
      label: `${t(`gameNames.${topic.id}`)} — ${r.item.kind === "order" ? r.item.answers[0] : r.item.prompt.replace("___", correctAnswer(r.item))}`,
      verdict: r.verdict,
    }));
    recordGrammarRound({ gameId: topic.id, score, bestStreak, answered, activity: { gameId: topic.id, pool: DEFAULT_POOL, at: Date.now() } });
  }, [phase, results, score, bestStreak, topic, recordGrammarRound, t]);

  const orderValue = useMemo(() => placed.map((i) => tiles[i]).join(" "), [placed, tiles]);

  if (!topic) return null;

  if (phase === "menu") {
    const record = current.games[topic.id];
    return (
      <section className="panel panel-pad stack drill-menu">
        <span className="eyebrow">{t("drill.eyebrow")}</span>
        <h2>{t(`gameNames.${topic.id}`)}</h2>
        <p className="muted">{t(`gameList.${topic.id}.description`)}</p>
        <p className="meta">{t("drill.roundInfo", { n: Math.min(10, topic.items.length), total: topic.items.length })}{record ? ` · ${t("drill.best", { score: record.bestScore })}` : ""}</p>
        <div className="row drill-actions">
          <button className="btn btn-lg" onClick={start}>{t("drill.start")}</button>
          <Link className="text-link" to={`/gramatyka#${topic.sheet}`}>{t("drill.sheet")}</Link>
        </div>
      </section>
    );
  }

  if (phase === "over") {
    const hits = results.filter((r) => r.verdict === "hit").length;
    const near = results.filter((r) => r.verdict === "near").length;
    const missed = results.filter((r) => r.verdict === "miss");
    return (
      <section className="panel panel-pad stack drill-over">
        <span className="eyebrow">{t("drill.result")}</span>
        <h2>{t("drill.score", { score })}</h2>
        <p className="muted">{t("drill.summary", { hits, near, total: results.length, streak: bestStreak })}</p>
        {missed.length > 0 && (
          <ul className="drill-missed">
            {missed.map((r) => (
              <li key={r.item.id}>
                <strong lang="hr">{correctAnswer(r.item)}</strong>
                <span className="muted">{r.item.explanation}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="row drill-actions">
          <button className="btn" onClick={start}>{t("drill.again")}</button>
          <Link className="btn-ghost" to="/gramatyka">{t("drill.back")}</Link>
        </div>
      </section>
    );
  }

  if (!item) return null;
  const [before, after] = item.kind === "order" ? ["", ""] : item.prompt.split("___");

  return (
    <section className="panel panel-pad stack drill-play">
      <div className="row drill-head">
        <span className="mono dim">{t("drill.progress", { n: index + 1, total: round.length })}</span>
        {item.tag && <span className="tag">{item.tag}</span>}
        <span className="mono dim drill-score">{score}</span>
      </div>

      {item.kind === "order" ? (
        <>
          <p className="drill-instruction">{t("drill.order")}</p>
          <p className="muted">{item.pl}</p>
          <div className="drill-built" lang="hr" aria-live="polite">{orderValue || <span className="dim">…</span>}</div>
          <div className="drill-tiles">
            {tiles.map((tile, i) => (
              <button key={i} className="chip" disabled={placed.includes(i) || Boolean(outcome)} onClick={() => setPlaced((p) => [...p, i])} lang="hr">
                {tile}
              </button>
            ))}
          </div>
          {!outcome && (
            <div className="row drill-actions">
              <button className="btn" disabled={placed.length !== tiles.length} onClick={() => answer(`${orderValue}`)}>{t("drill.check")}</button>
              <button className="btn-ghost" disabled={!placed.length} onClick={() => setPlaced((p) => p.slice(0, -1))}>{t("drill.undo")}</button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="drill-sentence" lang="hr">
            {before}
            <span className={`drill-gap${outcome ? ` ${outcome.verdict}` : ""}`}>{outcome ? correctAnswer(item) : item.kind === "gap" ? `(${item.hint})` : "…"}</span>
            {after}
          </p>
          <p className="muted">{item.pl}</p>
          {item.kind === "gap" && !outcome && (
            <div className="drill-input">
              <AnswerInput value={typed} onChange={setTyped} onSubmit={() => answer(typed)} placeholder={t("drill.placeholder")} characters={course.specialCharacters} focusKey={item.id} />
              <button className="btn" disabled={!typed.trim()} onClick={() => answer(typed)}>{t("drill.check")}</button>
            </div>
          )}
          {item.kind === "choice" && (
            <div className="drill-options">
              {item.options.map((option, i) => (
                <button
                  key={option}
                  className={`btn-ghost drill-option${outcome && i === item.answer ? " right" : ""}${outcome && outcome.given === option && i !== item.answer ? " wrong" : ""}`}
                  disabled={Boolean(outcome)}
                  onClick={() => answer(i)}
                  lang="hr"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {outcome && (
        <div className={`drill-feedback ${outcome.verdict}`} role="status">
          <strong>{t(`drill.verdict.${outcome.verdict}`)}</strong>
          {outcome.verdict !== "hit" && (
            <span>
              {t("drill.correctIs")} <strong lang="hr">{correctAnswer(item)}</strong>
              {item.kind !== "choice" && outcome.given ? <> · {t("drill.yours")} <span lang="hr">{outcome.given}</span></> : null}
            </span>
          )}
          <span className="muted">{item.explanation}</span>
          <button className="btn" onClick={next} autoFocus>{index + 1 >= round.length ? t("drill.finish") : t("drill.next")}</button>
        </div>
      )}
    </section>
  );
}
