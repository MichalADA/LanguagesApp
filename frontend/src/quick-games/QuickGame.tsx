import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PoolPicker } from "@/components/PoolPicker";
import { ProgressBar } from "@/components/StatCard";
import { useWordPool } from "@/hooks/useWordPool";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { useAuth } from "@/auth/useAuth";
import { useLearningSession } from "@/learning/useLearningSession";
import { toggleDifficult } from "@/flashcards/flashcardsApi";
import { useT } from "@/i18n";
import type { PoolSelection } from "@/progress/types";
import type { AnsweredWord } from "@/progress/service";
import type { VocabularyEntry as Word } from "@/vocabulary/types";
import { buildQuestions, scrambledLetters, shuffle, type QuickGameId, type Question } from "./helpers";

type Rating = "known" | "unknown" | "difficult";
type Answer = (word: Word, correct: boolean, answer: string, rating?: Rating) => void;

export function QuickGame({ mode }: { mode: QuickGameId }) {
  const t = useT();
  const { course } = useCourse();
  const { status, apiRequest } = useAuth();
  const progress = useProgress();
  const learning = useLearningSession();
  const { loading, error } = useVocabulary();
  const [selection, setSelection] = useState<PoolSelection>({ source: { kind: "level", level: "A1" }, topic: null });
  const pool = useWordPool(selection);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<"menu" | "playing" | "result">("menu");
  const [index, setIndex] = useState(0);
  const [counts, setCounts] = useState({ correct: 0, wrong: 0, difficult: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [syncError, setSyncError] = useState(false);
  const [empty, setEmpty] = useState(false);
  const started = useRef(0), finished = useRef(false);
  const answers = useRef<AnsweredWord[]>([]);
  const totals = useRef({ correct: 0, wrong: 0, difficult: 0 });
  const [run, setRun] = useState(0);
  const matching = mode === "pairs" || mode === "match-columns";

  const start = () => {
    const next = buildQuestions(mode, pool);
    if (!next.length || (matching && next.length < 2)) { setEmpty(true); return; }
    answers.current = []; totals.current = { correct: 0, wrong: 0, difficult: 0 };
    setCounts(totals.current); setIndex(0); setElapsed(0); setEmpty(false); setSyncError(false);
    finished.current = false; started.current = Date.now();
    setQuestions(next); setRun((value) => value + 1); setPhase("playing");
    progress.rememberActivity(mode, selection);
    if (mode !== "swipe") learning.start(course.id);
  };

  const answer: Answer = (word, correct, text, rating) => {
    if (finished.current) return;
    const next = { ...totals.current };
    if (rating === "difficult") next.difficult++;
    else if (correct) next.correct++;
    else next.wrong++;
    totals.current = next; setCounts(next);
    // Self-assessment is not an objectively correct answer: do not inflate mastery.
    if (mode !== "swipe") {
      answers.current.push({ entry: word, verdict: correct ? "hit" : "miss" });
      learning.record({ wordRef: word.id, answer: text, correct });
    }
    if (rating === "difficult") {
      if (!progress.statOf(word).markedDifficult) progress.toggleFlag(word);
      if (status === "authenticated") void toggleDifficult(apiRequest, { course: course.id, wordRef: word.id, markedDifficult: true }).catch(() => setSyncError(true));
    }
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    setElapsed(Math.round((Date.now() - started.current) / 1000));
    progress.recordRound({ gameId: mode, score: totals.current.correct, answered: answers.current,
      activity: { gameId: mode, pool: selection, at: Date.now() } });
    void learning.finish(); setPhase("result");
  };
  const next = () => { if (index + 1 >= questions.length) finish(); else setIndex((value) => value + 1); };

  if (phase === "menu") return <section className="panel panel-pad stack">
    <PoolPicker value={selection} onChange={(value) => { setSelection(value); setEmpty(false); }} poolSize={pool.length} />
    {mode === "odd-one-out" && <p className="stat-note">{t("quick.oddHint")}</p>}
    {(empty || error) && <p role="alert" className="form-message">{t(error ? "quick.loadError" : "quick.empty")}</p>}
    <button className="btn" disabled={loading || !progress.ready || pool.length === 0} onClick={start}>{t("common.start")}</button>
  </section>;
  const attempts = counts.correct + counts.wrong;
  const accuracy = attempts ? Math.round(counts.correct / attempts * 100) : 0;
  if (phase === "result") return <section className="panel result-card">
    <h2>{t("quick.result")}</h2>
    <p>{t(mode === "swipe" ? "quick.known" : "quick.correct")}: {counts.correct}</p>
    <p>{t(mode === "swipe" ? "quick.unknown" : "quick.wrong")}: {counts.wrong}</p>
    {mode === "swipe" ? <><p>{t("quick.difficult")}: {counts.difficult}</p><p className="stat-note">{t("quick.selfAssessment")}</p></> : <p>{t("quick.accuracy")}: {accuracy}%</p>}
    {matching && <><p>{t("quick.moves")}: {attempts}</p><p>{t("quick.time", { n: elapsed })}</p></>}
    {syncError && <p role="alert">{t("quick.syncError")}</p>}
    <div className="row"><button className="btn" onClick={start}>{t("game.again")}</button><button className="btn-ghost" onClick={() => setPhase("menu")}>{t("game.changePool")}</button><Link to="/gry/kategoria/quick" className="btn-ghost">{t("games.backToList")}</Link></div>
  </section>;

  return <section className="panel panel-pad stack">
    <div className="row"><span>{t("quick.progress", { n: matching ? counts.correct : index, total: questions.length })}</span><span>{t(mode === "swipe" ? "quick.known" : "quick.correct")}: {counts.correct}</span><span>{t(mode === "swipe" ? "quick.unknown" : "quick.wrong")}: {counts.wrong}</span></div>
    <ProgressBar percent={(matching ? counts.correct : index) / questions.length * 100} />
    {syncError && <p role="alert">{t("quick.syncError")}</p>}
    {matching ? <MatchingBoard key={run} words={questions.map((question) => question.word)} memory={mode === "pairs"} answer={answer} finish={finish} /> :
      <QuestionCard key={`${run}:${index}`} mode={mode} question={questions[index]} answer={answer} next={next} />}
  </section>;
}

function QuestionCard({ mode, question, answer, next }: { mode: QuickGameId; question: Question; answer: Answer; next: () => void }) {
  const t = useT();
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const locked = useRef(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [letters] = useState(() => scrambledLetters(question.word.targetText));
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const advanced = useRef(false);
  const nextRef = useRef(next); nextRef.current = next;
  const advance = () => {
    if (advanced.current) return;
    advanced.current = true;
    nextRef.current();
  };
  useEffect(() => {
    if (mode !== "swipe" || feedback === null) return;
    const timer = window.setTimeout(advance, 1400);
    return () => window.clearTimeout(timer);
  }, [mode, feedback]);
  const judge = (correct: boolean, text: string, rating?: Rating) => {
    if (locked.current) return;
    locked.current = true; setFeedback(correct); answer(question.word, correct, text, rating);
  };
  const rate = (rating: Rating) => judge(rating === "known", rating, rating);
  const composed = picked.map((id) => letters.find((item) => item.id === id)!.letter).join("");
  return <div className="stack quick-question">
    {mode === "swipe" ? <div className="quick-swipe" onPointerDown={(event) => { pointer.current = { x: event.clientX, y: event.clientY }; }} onPointerCancel={() => { pointer.current = null; }} onPointerUp={(event) => {
      const start = pointer.current; pointer.current = null;
      if (!start) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) rate(dx > 0 ? "known" : "unknown");
    }}><h2 lang="hr">{question.word.targetText}</h2><p className="stat-note">{t("quick.swipeHint")}</p></div> :
      <h2 className="quick-prompt">{mode === "true-false" ? question.word.targetText : mode === "odd-one-out" ? t("quick.oddPrompt") : question.word.sourceText}</h2>}
    {mode === "true-false" && <p className="quick-prompt">{question.translation}</p>}
    {(mode === "multiple-choice" || mode === "odd-one-out") && <div className="grid grid-2">{question.options?.map((word) => <button key={word.id} className="tile" disabled={feedback !== null} onClick={() => judge(word.id === question.word.id, word.targetText)}>{word.targetText}</button>)}</div>}
    {mode === "true-false" && <div className="row">{[true, false].map((value) => <button className="btn-ghost" key={String(value)} disabled={feedback !== null} onClick={() => judge(value === question.correct, String(value))}>{t(value ? "quick.yes" : "quick.no")}</button>)}</div>}
    {mode === "swipe" && <div className="row">{(["unknown", "known", "difficult"] as const).map((rating) => <button className="btn-ghost" key={rating} disabled={feedback !== null} onClick={() => rate(rating)}>{t(`quick.${rating}`)}</button>)}</div>}
    {mode === "scrambled-word" && <>
      <output className="quick-prompt" aria-live="polite">{composed || "…"}</output>
      <div className="row">{letters.map(({ id, letter }) => <button className="charbar-key" key={id} disabled={feedback !== null || picked.includes(id)} onClick={() => setPicked((previous) => previous.includes(id) ? previous : [...previous, id])}>{letter}</button>)}</div>
      <div className="row"><button className="btn-ghost" disabled={feedback !== null || !picked.length} onClick={() => setPicked((value) => value.slice(0, -1))}>{t("quick.undo")}</button><button className="btn-ghost" disabled={feedback !== null || !picked.length} onClick={() => setPicked([])}>{t("quick.clear")}</button><button className="btn" disabled={feedback !== null || picked.length !== letters.length} onClick={() => judge(composed.normalize("NFC") === question.word.targetText.normalize("NFC"), composed)}>{t("game.check")}</button></div>
    </>}
    {feedback !== null && <div className="stack" role="status">
      {mode !== "swipe" && <strong>{t(feedback ? "game.correct" : "game.wrong")}</strong>}
      <p>{question.word.targetText} — {question.word.sourceText}</p>
      {question.topic && <p className="stat-note">{t("quick.category", { topic: t(`quickTopics.${question.topic}`) })}</p>}
      <button className="btn" onClick={advance}>{t("game.next")}</button>
    </div>}
  </div>;
}

function MatchingBoard({ words, memory, answer, finish }: { words: Word[]; memory: boolean; answer: Answer; finish: () => void }) {
  const t = useT();
  const cards = useMemo(() => {
    const left = words.map((word) => ({ word, side: "source" as const, id: `${word.id}:source`, text: word.sourceText }));
    const right = words.map((word) => ({ word, side: "target" as const, id: `${word.id}:target`, text: word.targetText }));
    const shuffleRight = shuffle(right);
    return memory ? shuffle([...left, ...right]) : shuffle(left).flatMap((card, index) => [card, shuffleRight[index]]);
  }, []);
  const [selected, setSelected] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const choose = (id: string) => {
    if (locked.current || matched.includes(id) || selected.includes(id)) return;
    const card = cards.find((item) => item.id === id)!;
    if (!selected.length) { setSelected([id]); return; }
    const first = cards.find((item) => item.id === selected[0])!;
    if (!memory && first.side === card.side) { setSelected([id]); return; }
    locked.current = true; setSelected([first.id, id]);
    const correct = first.side !== card.side && first.word.id === card.word.id;
    setFeedback(correct); answer(first.word, correct, card.text);
    const nextMatched = correct ? [...matched, first.id, id] : matched;
    if (correct) setMatched(nextMatched);
    timer.current = setTimeout(() => {
      setSelected([]); setFeedback(null); locked.current = false;
      if (nextMatched.length === cards.length) finish();
    }, correct ? 450 : 1000);
  };
  return <div className="stack">
    <p className="stat-note">{t(memory ? "quick.memoryHint" : "quick.matchHint")}</p>
    <div className={memory ? "quick-memory" : "quick-columns"}>{cards.map((card, index) => {
      const found = matched.includes(card.id), visible = !memory || found || selected.includes(card.id);
      return <button key={card.id} className={`tile quick-tile${selected.includes(card.id) ? " on" : ""}${found ? " matched" : ""}`} aria-label={visible ? card.text : t("quick.hiddenCard", { n: index + 1 })} disabled={found || (feedback !== null)} onClick={() => choose(card.id)}>{visible ? card.text : "?"}</button>;
    })}</div>
    <p role="status">{feedback === null ? "\u00a0" : t(feedback ? "game.correct" : "game.wrong")}</p>
  </div>;
}
