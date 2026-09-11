import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PoolPicker } from "@/components/PoolPicker";
import { ProgressBar } from "@/components/StatCard";
import { useCourse } from "@/courses/CourseProvider";
import { useT } from "@/i18n";
import { useLearningSession } from "@/learning/useLearningSession";
import { LEARNING_LEVELS, type LearningLevelId } from "@/config/learningLevels";
import type { PoolSelection } from "@/progress/types";
import { loadSentences } from "./loader";
import { createSentenceQueue, sentencePool, SENTENCE_SESSION_SIZE } from "./queue";
import { checkSentenceAnswer, expectedAnswers } from "./validation";
import { joinTokens, shuffledTokens, type SentenceToken } from "./helpers";
import type { Sentence, SentenceAnswer, SentenceMode } from "./types";

export function SentenceGameSession({ mode }: { mode: SentenceMode }) {
  const { course } = useCourse();
  const t = useT();
  if (course.id !== "pl-hr") return <p role="status">{t("sentences.courseOnly")}</p>;
  return <Session key={`${course.id}:${mode}`} mode={mode} />;
}

function Session({ mode }: { mode: SentenceMode }) {
  const t = useT();
  const learning = useLearningSession({ trackVocabulary: false, gameType: `sentence-${mode}` });
  const [rows, setRows] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const [selection, setSelection] = useState<PoolSelection>({ source: { kind: "level", level: "A1" }, topic: null });
  const level = selection.source.kind === "level" ? selection.source.level : "A1";
  const [phase, setPhase] = useState<"menu" | "playing" | "result">("menu");
  const [queue, setQueue] = useState<Sentence[]>([]), [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState(""), [feedback, setFeedback] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<SentenceAnswer[]>([]);
  const [tokens, setTokens] = useState<SentenceToken[]>([]), [chosen, setChosen] = useState<string[]>([]);
  const usedHint = useRef(false), questionStarted = useRef(0);
  const [hint, setHint] = useState(false);
  const guard = useRef<"answer" | "feedback" | "advancing" | "finished">("finished");
  const current = queue[index];
  const counts = useMemo(() => Object.fromEntries(LEARNING_LEVELS.map(item => [item.id, sentencePool(rows, item.id, mode).length])) as Record<LearningLevelId, number>, [rows, mode]);
  const correct = answers.filter(item => item.correct).length, wrong = answers.length - correct;
  const accuracy = answers.length ? Math.round(correct / answers.length * 100) : 0;

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(false);
    loadSentences().then(data => { if (alive) setRows(data); }).catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [retry]);

  function prepare(sentence: Sentence) {
    usedHint.current = false; questionStarted.current = Date.now();
    setAnswer(""); setFeedback(null); setHint(false); setChosen([]); setTokens(shuffledTokens(sentence.croatian));
  }
  function start() {
    const next = createSentenceQueue(rows, level, mode);
    if (next.length !== SENTENCE_SESSION_SIZE) return;
    guard.current = "answer"; setQueue(next); setIndex(0); setAnswers([]); prepare(next[0]); setPhase("playing");
    learning.start("pl-hr");
  }
  const built = joinTokens(chosen.map(id => tokens.find(token => token.id === id)!));
  function submit() {
    const value = mode === "builder" ? built : answer;
    if (guard.current !== "answer" || !current || !value.trim() || (mode === "builder" && chosen.length !== tokens.length)) return;
    guard.current = "feedback";
    const hit = checkSentenceAnswer(current, mode, value);
    setFeedback(hit); setAnswers(previous => [...previous, { sentenceId: current.id, answer: value, correct: hit }]);
    learning.record({ wordRef: `sentence:${mode}:${current.id}`, answer: value, correct: hit, usedHint: usedHint.current, responseTimeMs: Math.min(86400000, Date.now() - questionStarted.current) });
  }
  function next() {
    if (guard.current !== "feedback") return;
    guard.current = "advancing";
    if (index + 1 === queue.length) {
      guard.current = "finished"; setPhase("result"); void learning.finish();
    } else {
      prepare(queue[index + 1]); setIndex(index + 1);
    }
  }
  // Reset the input guard after React commits the next question, so double clicks
  // cannot submit/advance the old question twice.
  useEffect(() => { if (phase === "playing" && guard.current === "advancing") guard.current = "answer"; }, [index, phase]);

  if (loading) return <p role="status">{t("sentences.loading")}</p>;
  if (error) return <section className="panel panel-pad stack"><p role="alert">{t("sentences.loadError")}</p><button className="btn" onClick={() => setRetry(value => value + 1)}>{t("sentences.retry")}</button></section>;
  if (phase === "menu") return <section className="panel panel-pad stack">
    <PoolPicker value={selection} onChange={setSelection} poolSize={counts[level]} sentenceCounts={counts} />
    <p>{t("sentences.sessionLength", { n: SENTENCE_SESSION_SIZE })}</p>
    {counts[level] < SENTENCE_SESSION_SIZE && <p role="status">{t("sentences.notEnough")}</p>}
    <button className="btn" disabled={counts[level] < SENTENCE_SESSION_SIZE} onClick={start}>{t("sentences.start")}</button>
  </section>;
  if (phase === "result") return <section className="panel panel-pad stack" aria-label={t("sentences.result")}>
    <h2>{t("sentences.result")}</h2>
    <p>{t("sentences.correct")}: {correct} / {queue.length}</p><p>{t("sentences.wrong")}: {wrong}</p><p>{t("sentences.accuracy")}: {accuracy}%</p>
    <div className="row sentence-actions"><button className="btn" onClick={start}>{t("sentences.again")}</button><button className="btn-ghost" onClick={() => setPhase("menu")}>{t("sentences.changeLevel")}</button><Link className="btn-ghost" to="/gry/kategoria/sentences">{t("sentences.games")}</Link></div>
  </section>;

  return <section className="panel panel-pad stack sentence-session">
    <div className="row sentence-actions" aria-live="polite"><span>{level} · {t("sentences.progress", { n: answers.length, total: queue.length })}</span><span>{t("sentences.correct")}: {correct}</span><span>{t("sentences.wrong")}: {wrong}</span><span>{t("sentences.accuracy")}: {accuracy}%</span></div>
    <ProgressBar percent={answers.length / queue.length * 100} tone="learning" />
    <h2 className="sentence-prompt" lang={mode === "translation" || mode === "builder" ? "pl" : "hr"}>
      {mode === "gap" ? current.gapText : mode === "correction" ? current.incorrectSentence : mode === "transform" ? current.croatian : current.polish}
    </h2>
    {mode === "transform" && <p>{t(current.transformInstruction)}</p>}
    {mode === "gap" && <><button className="btn-ghost" aria-expanded={hint} onClick={() => { usedHint.current = true; setHint(value => !value); }}>{t("sentences.hint")}</button>{hint && <p lang="pl">{current.polish}</p>}</>}
    <form className="stack" onSubmit={event => { event.preventDefault(); submit(); }}>
      {mode === "builder" ? <>
        <p className="sentence-built" lang="hr" aria-live="polite">{built || t("sentences.selectWords")}</p>
        <div className="row sentence-actions">{tokens.map(token => <button type="button" className="btn-ghost" key={token.id} lang="hr" disabled={feedback !== null || chosen.includes(token.id)} onClick={() => {
          if (guard.current === "answer") setChosen(previous => previous.includes(token.id) ? previous : [...previous, token.id]);
        }}>{token.text}</button>)}</div>
        <div className="row sentence-actions"><button type="button" className="btn-ghost" disabled={feedback !== null || !chosen.length} onClick={() => setChosen(previous => previous.slice(0, -1))}>{t("sentences.undo")}</button><button type="button" className="btn-ghost" disabled={feedback !== null || !chosen.length} onClick={() => setChosen([])}>{t("sentences.clear")}</button></div>
      </> : <label className="stack">{t("sentences.yourAnswer")}
        <input key={current.id} className="login-input" lang="hr" autoFocus autoComplete="off" spellCheck={false} maxLength={500} value={answer} disabled={feedback !== null} onChange={event => setAnswer(event.target.value)} />
      </label>}
      <button className="btn" type="submit" disabled={feedback !== null || (mode === "builder" ? chosen.length !== tokens.length : !answer.trim())}>{t("sentences.check")}</button>
    </form>
    {feedback !== null && <div className="stack" role="status">
      <strong>{t(feedback ? "sentences.good" : "sentences.incorrect")}</strong>
      <p>{t("sentences.correctAnswer")}: <span lang="hr">{expectedAnswers(current, mode)[0]}</span></p>
      {mode === "correction" && <p>{t(current.correctionExplanation)}</p>}
      <button className="btn" onClick={next}>{t("sentences.next")}</button>
    </div>}
  </section>;
}
