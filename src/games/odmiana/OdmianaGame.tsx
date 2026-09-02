import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Verdict } from "@/services/validation";
import type { AnsweredForm } from "@/progress/service";
import type { PersonId, VerbEntry } from "@/grammar/types";
import { PERSONS, formKey, personDef } from "@/grammar/types";
import { useGrammar } from "@/grammar/GrammarProvider";
import { useCourse } from "@/courses/CourseProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { DEFAULT_POOL } from "@/hooks/useWordPool";
import { AnswerInput } from "@/components/AnswerInput";
import { SpecialCharacters } from "@/components/SpecialCharacters";
import { useT } from "@/i18n";
import {
  DEFAULT_LEVEL,
  FULL_CLEAN_BONUS,
  HARD_FULL_EVERY,
  LEVELS,
  ODMIANA_ID,
  formLabel,
  judgeForm,
  levelPool,
  pickSingle,
  pickVerb,
  pointsFor,
  roundLength,
} from "./logic";
import type { Level, Mode } from "./logic";

type Phase = "menu" | "play" | "over";

interface Question {
  kind: "single" | "full";
  verb: VerbEntry;
  person?: PersonId;
}

type Outcome =
  | { kind: "single"; verdict: Verdict; answer: string }
  | { kind: "full"; verdicts: Record<PersonId, Verdict>; answers: Record<PersonId, string> };

const emptyFields = (): Record<PersonId, string> =>
  PERSONS.reduce(
    (acc, p) => ({ ...acc, [p.id]: "" }),
    {} as Record<PersonId, string>,
  );

/**
 * Odmiana — produkcja formy czasownika z pamięci. Dwa tryby (jedna osoba /
 * pełna tabela), trzy poziomy, postęp liczony PER FORMA (czasownik + osoba),
 * więc mylone formy wracają częściej. Dane: dataset gramatyczny aktywnego kursu.
 */
export function OdmianaGame() {
  const t = useT();
  const { course } = useCourse();
  const { verbs, loading, error, available } = useGrammar();
  const { state, current, recordGrammarRound, rememberActivity } = useProgress();
  const settings = state.settings;

  const [phase, setPhase] = useState<Phase>("menu");
  const [level, setLevel] = useState<Level>(DEFAULT_LEVEL);
  const [mode, setMode] = useState<Mode>("single");

  const [question, setQuestion] = useState<Question | null>(null);
  const [typed, setTyped] = useState("");
  const [fields, setFields] = useState<Record<PersonId, string>>(emptyFields);
  const [activeField, setActiveField] = useState<PersonId>("ja");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const [asked, setAsked] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [answered, setAnswered] = useState<AnsweredForm[]>([]);

  const recentVerbs = useRef<string[]>([]);
  const recentPersons = useRef<PersonId[]>([]);
  const streakRef = useRef(0);
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const statOf = useCallback((key: string) => current.forms[key], [current.forms]);
  const pool = useMemo(() => levelPool(verbs, level), [verbs, level]);
  const total = roundLength(mode, settings.roundLength);
  const record = current.games[ODMIANA_ID];

  const makeQuestion = useCallback(
    (index: number): Question | null => {
      const wantFull =
        mode === "full" || (level === "hard" && index % HARD_FULL_EVERY === HARD_FULL_EVERY - 1);
      if (wantFull) {
        const verb = pickVerb(pool, statOf, recentVerbs.current);
        return verb ? { kind: "full", verb } : null;
      }
      const pick = pickSingle(pool, statOf, recentVerbs.current, recentPersons.current);
      return pick ? { kind: "single", verb: pick.verb, person: pick.person } : null;
    },
    [mode, level, pool, statOf],
  );

  const serve = useCallback(
    (index: number) => {
      const q = makeQuestion(index);
      if (!q) return;
      recentVerbs.current = [...recentVerbs.current, q.verb.id].slice(-6);
      if (q.person) recentPersons.current = [...recentPersons.current, q.person].slice(-4);
      setQuestion(q);
      setTyped("");
      setFields(emptyFields());
      setActiveField("ja");
      setOutcome(null);
      if (q.kind === "full") {
        window.setTimeout(() => fieldRefs.current.ja?.focus(), 40);
      }
    },
    [makeQuestion],
  );

  const start = useCallback(() => {
    if (pool.length === 0) return;
    rememberActivity(ODMIANA_ID, DEFAULT_POOL);
    recentVerbs.current = [];
    recentPersons.current = [];
    streakRef.current = 0;
    setAsked(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setHits(0);
    setMisses(0);
    setAnswered([]);
    setPhase("play");
    serve(0);
  }, [pool.length, rememberActivity, serve]);

  const registerForm = useCallback(
    (verb: VerbEntry, person: PersonId, verdict: Verdict) => {
      setAnswered((prev) => [
        ...prev,
        {
          key: formKey(verb.id, person),
          verbId: verb.id,
          person,
          label: formLabel(verb, person),
          verdict,
        },
      ]);
      const ok = verdict !== "miss";
      if (ok) setHits((n) => n + 1);
      else setMisses((n) => n + 1);
      // Seria idzie przez ref, bo w pełnej odmianie liczymy sześć form w jednej
      // synchronicznej pętli — stan z setState nie byłby jeszcze odświeżony.
      const nextStreak = ok ? streakRef.current + 1 : 0;
      streakRef.current = nextStreak;
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      if (ok) setScore((s) => s + pointsFor(verdict, verb, level));
    },
    [level],
  );

  const submitSingle = useCallback(
    (input: string | null) => {
      if (!question || question.kind !== "single" || !question.person || outcome) return;
      const verdict = judgeForm(
        course,
        question.verb,
        question.person,
        input,
        settings.lenientDiacritics,
      );
      registerForm(question.verb, question.person, verdict);
      setOutcome({ kind: "single", verdict, answer: (input ?? "").trim() });
    },
    [question, outcome, course, settings.lenientDiacritics, registerForm],
  );

  const submitFull = useCallback(() => {
    if (!question || question.kind !== "full" || outcome) return;
    const verdicts = {} as Record<PersonId, Verdict>;
    let clean = true;
    for (const p of PERSONS) {
      const verdict = judgeForm(
        course,
        question.verb,
        p.id,
        fields[p.id],
        settings.lenientDiacritics,
      );
      verdicts[p.id] = verdict;
      if (verdict !== "hit") clean = false;
      registerForm(question.verb, p.id, verdict);
    }
    if (clean) setScore((s) => s + FULL_CLEAN_BONUS);
    setOutcome({ kind: "full", verdicts, answers: { ...fields } });
  }, [question, outcome, course, fields, settings.lenientDiacritics, registerForm]);

  const finish = useCallback(() => {
    setPhase("over");
  }, []);

  const advance = useCallback(() => {
    const done = asked + 1;
    setAsked(done);
    if (done >= total) finish();
    else serve(done);
  }, [asked, total, finish, serve]);

  // Zapis rundy dopiero na ekranie wyniku — jeden wpis na rundę, jak w Burze.
  const saved = useRef(false);
  useEffect(() => {
    if (phase !== "over" || saved.current) return;
    saved.current = true;
    recordGrammarRound({
      gameId: ODMIANA_ID,
      score,
      bestStreak,
      answered,
      activity: { gameId: ODMIANA_ID, pool: DEFAULT_POOL, at: Date.now() },
    });
  }, [phase, score, bestStreak, answered, recordGrammarRound]);

  useEffect(() => {
    if (phase === "play") saved.current = false;
  }, [phase]);

  useEffect(() => {
    if (phase !== "play" || !outcome) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, outcome, advance]);

  const hardest = useMemo(() => {
    const count = new Map<string, number>();
    for (const a of answered) {
      if (a.verdict === "miss") count.set(a.label, (count.get(a.label) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [answered]);

  const verbsPracticed = useMemo(
    () => new Set(answered.map((a) => a.verbId)).size,
    [answered],
  );

  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

  if (!available) return <span className="empty">{t("odmiana.noDataset")}</span>;
  if (loading) return <span className="loading">{t("common.loading")}</span>;
  if (error) return <span className="empty">{t("odmiana.datasetError", { error })}</span>;

  /* ---------- Menu ---------- */

  if (phase === "menu") {
    return (
      <div className="stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 10 }}>
          <span className="eyebrow">{t("odmiana.stepLevel")}</span>
          <div className="grid grid-3">
            {LEVELS.map((id) => (
              <button
                key={id}
                type="button"
                className={level === id ? "tile on" : "tile"}
                onClick={() => setLevel(id)}
              >
                <span style={{ fontSize: 17, fontWeight: 600 }}>{t(`odmiana.level.${id}`)}</span>
                <span className="tile-note">{t(`odmiana.levelNote.${id}`)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <span className="eyebrow">{t("odmiana.stepMode")}</span>
          <div className="row" style={{ gap: 8 }}>
            {(["single", "full"] as Mode[]).map((id) => (
              <button
                key={id}
                type="button"
                className={mode === id ? "chip on" : "chip"}
                onClick={() => setMode(id)}
              >
                {t(`odmiana.mode.${id}`)}
              </button>
            ))}
          </div>
          <span className="stat-note">{t(`odmiana.modeNote.${mode}`)}</span>
        </div>

        <div className="row" style={{ gap: 16 }}>
          <button type="button" className="btn" onClick={start} disabled={pool.length === 0}>
            {t("common.start")}
          </button>
          <span className="stat-note">
            {t("odmiana.roundInfo", { verbs: pool.length, questions: total })}
          </span>
        </div>

        <div className="grid grid-3 rules">
          <Rule title={t("odmiana.rules.recall")}>{t("odmiana.rules.recallNote")}</Rule>
          <Rule title={t("odmiana.rules.memory")}>{t("odmiana.rules.memoryNote")}</Rule>
          <Rule title={t("odmiana.rules.diacritics")}>
            {settings.lenientDiacritics
              ? t("odmiana.rules.diacriticsOn")
              : t("odmiana.rules.diacriticsOff")}
          </Rule>
        </div>
      </div>
    );
  }

  /* ---------- Wynik rundy ---------- */

  if (phase === "over") {
    return (
      <div className="stack" style={{ gap: 22 }}>
        <div className="panel result-card">
          <span className="eyebrow">{t("odmiana.result.title")}</span>
          <span className="result-score">{score}</span>
          <span className="mono dim" style={{ fontSize: 14 }}>
            {t("game.record", { n: record?.bestScore ?? score })}
          </span>
          <div className="grid odmiana-summary">
            <Metric value={hits} label={t("odmiana.result.correct")} />
            <Metric value={misses} label={t("odmiana.result.wrong")} />
            <Metric value={`${accuracy}%`} label={t("odmiana.result.accuracy")} />
            <Metric value={bestStreak} label={t("odmiana.result.bestStreak")} />
            <Metric value={verbsPracticed} label={t("odmiana.result.verbs")} />
          </div>
          <div className="row" style={{ marginTop: 16, gap: 10, justifyContent: "center" }}>
            <button type="button" className="btn" onClick={start}>
              {t("odmiana.result.again")}
            </button>
            <Link to="/gry" className="btn-ghost">
              {t("odmiana.result.back")}
            </Link>
          </div>
        </div>

        {hardest.length > 0 && (
          <div className="stack" style={{ gap: 10 }}>
            <span className="eyebrow">{t("odmiana.result.hardest")}</span>
            <div className="list">
              {hardest.map(([label, n]) => (
                <div key={label} className="list-row">
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{label}</span>
                  <span className="mono dim" style={{ fontSize: 12 }}>
                    {t("odmiana.result.missCount", { n })}
                  </span>
                </div>
              ))}
            </div>
            <span className="stat-note">{t("odmiana.result.hardestNote")}</span>
          </div>
        )}
      </div>
    );
  }

  if (!question) return <span className="loading">{t("common.loading")}</span>;

  /* ---------- Rozgrywka ---------- */

  const verb = question.verb;
  const person = question.person;
  const showTranslation = level !== "hard" || Boolean(outcome);

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="hud">
        <div className="row" style={{ gap: 20, alignItems: "baseline" }}>
          <span className="hud-score">{score}</span>
          <span className="dim">{t("common.points")}</span>
          <span style={{ color: streak > 2 ? "var(--gold-light)" : "var(--dim)" }}>
            {t("game.streak", { n: streak })}
          </span>
        </div>
        <div className="row" style={{ gap: 16 }}>
          <span className="dim">
            {Math.min(asked + 1, total)} / {total}
          </span>
          <span className="badge">{t(`odmiana.level.${level}`)}</span>
        </div>
      </div>

      <div className="bar">
        <span
          style={{
            width: `${((asked + (outcome ? 1 : 0)) / total) * 100}%`,
            background: "var(--accent)",
            transition: "width .18s var(--ease)",
          }}
        />
      </div>

      <div className="arena">
        <div className="stack" style={{ gap: 4, alignItems: "center" }}>
          <span className="prompt" style={{ fontSize: 38 }}>
            {verb.infinitive}
          </span>
          <span className="muted" style={{ fontSize: 17, minHeight: 24 }}>
            {showTranslation ? verb.translation : "· · ·"}
          </span>
        </div>

        {question.kind === "single" && person && !outcome && (
          <div className="stack" style={{ alignItems: "center", gap: 14, width: "100%" }}>
            <span className="person-tag">{personDef(person).label}</span>
            <AnswerInput
              value={typed}
              onChange={setTyped}
              onSubmit={() => submitSingle(typed)}
              placeholder={t("odmiana.placeholder")}
              characters={course.specialCharacters}
              focusKey={`${verb.id}:${person}`}
            />
            <div className="row" style={{ gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                className="btn"
                style={{ padding: "10px 22px", fontSize: 14 }}
                onClick={() => submitSingle(typed)}
              >
                {t("game.check")} ⏎
              </button>
              <button type="button" className="btn-ghost" onClick={() => submitSingle(null)}>
                {t("odmiana.dontKnow")}
              </button>
            </div>
          </div>
        )}

        {question.kind === "full" && !outcome && (
          <div className="stack" style={{ alignItems: "center", gap: 14, width: "100%" }}>
            <span className="eyebrow">{t("odmiana.fullPrompt")}</span>
            <div className="conj-fields">
              {PERSONS.map((p, i) => (
                <label key={p.id} className="conj-field">
                  <span className="conj-pron">{p.pronoun}</span>
                  <input
                    ref={(el) => {
                      fieldRefs.current[p.id] = el;
                    }}
                    className="field field-sm"
                    type="text"
                    value={fields[p.id]}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onFocus={() => setActiveField(p.id)}
                    onChange={(e) => setFields((f) => ({ ...f, [p.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const nextPerson = PERSONS[i + 1];
                      if (nextPerson) fieldRefs.current[nextPerson.id]?.focus();
                      else submitFull();
                    }}
                  />
                </label>
              ))}
            </div>
            <SpecialCharacters
              characters={course.specialCharacters}
              onInsert={(ch) => {
                setFields((f) => ({ ...f, [activeField]: f[activeField] + ch }));
                fieldRefs.current[activeField]?.focus();
              }}
            />
            <button
              type="button"
              className="btn"
              style={{ padding: "10px 22px", fontSize: 14 }}
              onClick={submitFull}
            >
              {t("game.check")} ⏎
            </button>
          </div>
        )}

        {outcome && (
          <div className="stack" style={{ alignItems: "center", gap: 14, width: "100%" }}>
            {outcome.kind === "single" && person && (
              <>
                <span className="eyebrow" style={{ color: verdictColor(outcome.verdict) }}>
                  {outcome.verdict === "hit"
                    ? t("odmiana.hit")
                    : outcome.verdict === "near"
                      ? t("odmiana.near")
                      : t("odmiana.miss")}
                </span>
                <span className="answer">{verb.forms[person]}</span>
                {outcome.verdict !== "hit" && (
                  <div className="answer-compare">
                    <span className="dim">{t("odmiana.yourAnswer")}</span>
                    <span style={{ color: verdictColor(outcome.verdict), fontWeight: 600 }}>
                      {outcome.answer || "—"}
                    </span>
                  </div>
                )}
              </>
            )}

            {outcome.kind === "full" && (
              <span
                className="eyebrow"
                style={{
                  color: PERSONS.every((p) => outcome.verdicts[p.id] === "hit")
                    ? "var(--good)"
                    : "var(--warn)",
                }}
              >
                {PERSONS.filter((p) => outcome.verdicts[p.id] !== "miss").length} / {PERSONS.length}{" "}
                {t("odmiana.fullScore")}
              </span>
            )}

            <div className="conj">
              {PERSONS.map((p) => {
                const rowVerdict =
                  outcome.kind === "full"
                    ? outcome.verdicts[p.id]
                    : person === p.id
                      ? outcome.verdict
                      : null;
                const typedValue = outcome.kind === "full" ? outcome.answers[p.id] : outcome.answer;
                return (
                  <div key={p.id} className={rowVerdict ? `conj-row marked` : "conj-row"}>
                    <span className="conj-pron">{p.pronoun}</span>
                    <span
                      className="conj-form"
                      style={rowVerdict ? { color: verdictColor(rowVerdict) } : undefined}
                    >
                      {verb.forms[p.id]}
                    </span>
                    {rowVerdict && rowVerdict !== "hit" && (
                      <span className="conj-typed">
                        {typedValue ? `✗ ${typedValue}` : t("odmiana.blank")}
                      </span>
                    )}
                    {rowVerdict === "hit" && <span className="conj-typed ok">✓</span>}
                  </div>
                );
              })}
            </div>

            <div className="example">
              <div className="example-hr">{verb.exampleTarget}</div>
              <div className="example-pl">{verb.exampleSource}</div>
            </div>

            {verb.note && <div className="note-teach">{verb.note}</div>}

            <button type="button" className="btn" style={{ marginTop: 4 }} onClick={advance}>
              {t("odmiana.next")} ⏎
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function verdictColor(verdict: Verdict): string {
  if (verdict === "hit") return "var(--good)";
  if (verdict === "near") return "var(--warn)";
  return "var(--bad)";
}

function Metric({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value" style={{ fontSize: 24 }}>
        {value}
      </span>
      <span className="stat-label">{label}</span>
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
