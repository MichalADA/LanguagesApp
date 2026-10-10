import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerInput } from "@/components/AnswerInput";
import { AudioButton } from "@/components/AudioButton";
import { Icon } from "@/components/Icon";
import { useCourse } from "@/courses/CourseProvider";
import { useT } from "@/i18n";
import { Art, Portrait } from "../art/registry";
import { currentNode, evaluate, fill, visibleOptions, type PlayerInput, type RunState, type WorldContext } from "../engine";
import { audioFor } from "../integration";
import type { BuildNode, ChoiceNode, Mission, Npc, Story, TypeNode } from "../types";

interface Props {
  story: Story;
  mission: Mission;
  run: RunState;
  world: WorldContext;
  audio: Record<string, { female?: string; male?: string }>;
  /** XP widoczne w HUD (obecny stan konta / gościa). */
  xp: number;
  onAnswer: (input: PlayerInput) => void;
  onProceed: () => void;
  onHint: () => void;
  onExit: () => void;
}

/**
 * Scena rozmowy: tło lokacji, postać na pierwszym planie, panel dialogowy na dole.
 * Klawiatura: 1–4 wybiera odpowiedź, Enter = dalej / sprawdź, T = tłumaczenie.
 */
export function DialogueScene({ story, mission, run, world, audio, xp, onAnswer, onProceed, onHint, onExit }: Props) {
  const t = useT();
  const graph = mission.dialogue.graph;
  const node = currentNode(graph, run);
  const npc = story.npcs.find((n) => n.id === mission.npcId)!;
  const location = story.locations.find((l) => l.id === mission.locationId)!;
  const line = run.lastLine;
  const speaker: Npc | null = line && line.speaker !== "narrator" ? story.npcs.find((n) => n.id === line.speaker) ?? null : null;
  const [showTranslation, setShowTranslation] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const pending = run.pending;
  const mood = pending ? (pending.feedback.verdict === "wrong" ? "puzzled" : pending.feedback.verdict === "neutral" ? line?.mood ?? "neutral" : "happy") : line?.mood ?? "neutral";
  const objectivesDone = mission.objectives.filter((o) => evaluate(o.done, run.flags, world.completed)).length;

  // Tłumaczenie to pomoc dla bieżącej wypowiedzi — chowa się przy kolejnej.
  useEffect(() => setShowTranslation(false), [run.nodeId, line]);

  const toggleTranslation = () => {
    if (!showTranslation && node.kind !== "say") onHint();
    setShowTranslation((v) => !v);
  };

  const continueRef = useRef<() => void>(() => undefined);
  continueRef.current = () => {
    if (pending) onProceed();
    else if (node.kind === "say") onAnswer({ kind: "continue" });
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const typing = (event.target as HTMLElement | null)?.tagName === "INPUT";
      if (event.key === "Enter" && !typing && (event.target as HTMLElement | null)?.tagName !== "BUTTON") {
        event.preventDefault();
        continueRef.current();
      }
      if (!typing && event.key.toLowerCase() === "t" && line) toggleTranslation();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const lineAudio = line ? audioFor(audio, line.text.hr, speaker?.voice) : undefined;

  return (
    <div className="vn" data-location={location.id}>
      <div className="vn-bg" key={location.id}>
        <Art id={location.background} />
      </div>

      <header className="vn-hud">
        <button type="button" className="vn-icon-btn" onClick={onExit} aria-label={t("stories.exit")}>
          <Icon name="close" size={18} />
        </button>
        <span className="vn-chip">
          {t("stories.missionChip", { n: String(mission.order).padStart(2, "0") })} · <span className="target">{mission.title.hr}</span>
        </span>
        <span className="vn-xp" aria-label={`XP: ${xp}`}>
          ★ {xp} XP
        </span>
      </header>

      <aside className="vn-objectives" aria-label={t("stories.objectives")}>
        <span className="eyebrow">
          {t("stories.objectives")} · {objectivesDone}/{mission.objectives.length}
        </span>
        <ul>
          {mission.objectives.map((o) => {
            const ok = evaluate(o.done, run.flags, world.completed);
            return (
              <li key={o.text} className={ok ? "done" : ""}>
                <span aria-hidden="true">{ok ? <Icon name="check" size={13} /> : "○"}</span>
                {o.text}
              </li>
            );
          })}
        </ul>
        <div className="vn-objectives-bar" role="progressbar" aria-valuemin={0} aria-valuemax={mission.objectives.length} aria-valuenow={objectivesDone} aria-label={t("stories.objectives")}>
          <span style={{ width: `${(objectivesDone / mission.objectives.length) * 100}%` }} />
        </div>
      </aside>

      <div className={`vn-character mood-${mood}`} key={`${npc.id}`}>
        <Portrait id={npc.portrait} mood={mood} title={npc.name} />
      </div>

      <section className="vn-panel" aria-live="polite">
        {line && (
          <div className="vn-line" key={run.transcript.length}>
            <span className={speaker ? "vn-nametag" : "vn-nametag narrator"}>{speaker ? speaker.name : t("stories.narrator")}</span>
            <p className="vn-text target">
              {line.text.hr}
              <AudioButton src={lineAudio} text={line.text.hr} size="sm" />
            </p>
            {showTranslation && <p className="vn-translation">{line.text.pl}</p>}
            <div className="vn-tools">
              <button type="button" className="linklike" onClick={toggleTranslation} aria-pressed={showTranslation}>
                {t(showTranslation ? "stories.hideTranslation" : "stories.showTranslation")}
              </button>
              <button type="button" className="linklike" onClick={() => setShowLog((v) => !v)} aria-expanded={showLog}>
                {t("stories.log")}
              </button>
            </div>
            {showLog && (
              <ol className="vn-log">
                {run.transcript.map((entry, i) => (
                  <li key={i} className={entry.player ? "player" : ""}>
                    <strong>{entry.player ? t("stories.you") : story.npcs.find((n) => n.id === entry.speaker)?.name ?? t("stories.narrator")}:</strong>{" "}
                    <span className="target">{entry.text.hr}</span> <span className="muted">— {entry.text.pl}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {pending ? (
          <FeedbackView run={run} onProceed={onProceed} audio={audio} />
        ) : node.kind === "say" ? (
          <div className="vn-actions">
            <button type="button" className="btn btn-lg vn-continue" onClick={() => onAnswer({ kind: "continue" })} autoFocus>
              {t("stories.continue")} <Icon name="arrowRight" size={18} />
            </button>
          </div>
        ) : node.kind === "choice" ? (
          <ChoiceView node={node} run={run} world={world} onAnswer={onAnswer} />
        ) : node.kind === "build" ? (
          <BuildView node={node} attempt={run.attempts[node.id] ?? 0} onAnswer={onAnswer} />
        ) : node.kind === "type" ? (
          <TypeView node={node} attempt={run.attempts[node.id] ?? 0} onAnswer={onAnswer} onHint={onHint} />
        ) : null}
      </section>
    </div>
  );
}

function ChoiceView({ node, run, world, onAnswer }: { node: ChoiceNode; run: RunState; world: WorldContext; onAnswer: (input: PlayerInput) => void }) {
  const options = visibleOptions(node, run, world);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const i = Number(event.key) - 1;
      if ((event.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (i >= 0 && i < options.length) onAnswer({ kind: "choice", optionId: options[i].id });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, onAnswer]);
  return (
    <div className="vn-respond">
      <span className="vn-instruction">{node.instruction}</span>
      <div className="vn-choices" role="group" aria-label={node.instruction}>
        {options.map((o, i) => (
          <button key={o.id} type="button" className="vn-choice" onClick={() => onAnswer({ kind: "choice", optionId: o.id })}>
            <span className="vn-choice-key" aria-hidden="true">
              {i + 1}
            </span>
            {o.text.hr ? <span className="target">{fill(o.text.hr, world.vars)}</span> : <span>{fill(o.text.pl, world.vars)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function BuildView({ node, attempt, onAnswer }: { node: BuildNode; attempt: number; onAnswer: (input: PlayerInput) => void }) {
  const t = useT();
  // Kolejność kafelków stała w ramach węzła (bez losowości — test i odtwarzalność).
  const tokens = useMemo(() => [...node.tokens].map((token, i) => ({ token, i })).sort((a, b) => (a.token.length * 7 + a.i * 3) % 5 - (b.token.length * 7 + b.i * 3) % 5), [node.tokens]);
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => setPicked([]), [attempt, node.id]);
  const sentence = picked.map((i) => node.tokens[i]).join(" ");
  return (
    <div className="vn-respond">
      <span className="vn-instruction">
        {node.instruction} {node.translation && <span className="muted">„{node.translation}”</span>}
      </span>
      <div className="vn-built" aria-live="polite">
        {picked.length === 0 && <span className="muted">{t("stories.buildHint")}</span>}
        {picked.map((i, pos) => (
          <button key={`${i}-${pos}`} type="button" className="order-token placed" onClick={() => setPicked((p) => p.filter((_, k) => k !== pos))}>
            {node.tokens[i]}
          </button>
        ))}
      </div>
      <div className="vn-bank" role="group" aria-label={node.instruction}>
        {tokens.map(({ token, i }) => (
          <button key={i} type="button" className="order-token" disabled={picked.includes(i)} onClick={() => setPicked((p) => [...p, i])}>
            {token}
          </button>
        ))}
      </div>
      <div className="vn-actions">
        {picked.length > 0 && (
          <button type="button" className="btn-ghost" onClick={() => setPicked([])}>
            {t("stories.clear")}
          </button>
        )}
        <button type="button" className="btn btn-lg" disabled={!picked.length} onClick={() => onAnswer({ kind: "text", value: sentence })}>
          {t("stories.check")}
        </button>
      </div>
    </div>
  );
}

function TypeView({ node, attempt, onAnswer, onHint }: { node: TypeNode; attempt: number; onAnswer: (input: PlayerInput) => void; onHint: () => void }) {
  const t = useT();
  const { course } = useCourse();
  const [value, setValue] = useState("");
  const [hint, setHint] = useState(false);
  useEffect(() => {
    setValue("");
    setHint(false);
  }, [attempt, node.id]);
  const submit = () => value.trim() && onAnswer({ kind: "text", value });
  return (
    <div className="vn-respond">
      <span className="vn-instruction">
        {node.instruction} {node.translation && <span className="muted">„{node.translation}”</span>}
      </span>
      <AnswerInput value={value} onChange={setValue} onSubmit={submit} placeholder={t("stories.typeHere")} characters={course.specialCharacters} focusKey={`${node.id}-${attempt}`} />
      <div className="vn-actions">
        {node.hint &&
          (hint ? (
            <span className="muted vn-hint">{node.hint}</span>
          ) : (
            <button
              type="button"
              className="linklike"
              onClick={() => {
                setHint(true);
                onHint();
              }}
            >
              {t("stories.hint")}
            </button>
          ))}
        <button type="button" className="btn btn-lg" disabled={!value.trim()} onClick={submit}>
          {t("stories.check")}
        </button>
      </div>
    </div>
  );
}

function FeedbackView({ run, onProceed, audio }: { run: RunState; onProceed: () => void; audio: Record<string, { female?: string; male?: string }> }) {
  const t = useT();
  const { feedback } = run.pending!;
  const player = [...run.transcript].reverse().find((e) => e.player);
  const title = feedback.verdict === "correct" ? "stories.fbCorrect" : feedback.verdict === "near" ? "stories.fbNear" : feedback.verdict === "wrong" ? (feedback.revealed ? "stories.fbRevealed" : "stories.fbWrong") : "stories.fbNeutral";
  const expected = feedback.expected;
  return (
    <div className={`vn-feedback ${feedback.verdict}`} role="status">
      {player && (
        <p className="vn-player">
          <span className="vn-nametag you">{t("stories.you")}</span> <span className="target">{player.text.hr}</span>
        </p>
      )}
      <strong className="vn-feedback-title">{t(title)}</strong>
      {expected && feedback.verdict !== "correct" && (
        <p>
          {t(feedback.verdict === "near" ? "stories.spelling" : "stories.correctAnswer")} <span className="target">{expected}</span>
          <AudioButton src={audioFor(audio, expected)} text={expected} size="sm" />
        </p>
      )}
      {feedback.explanation && feedback.verdict !== "correct" && <p className="vn-explanation">{feedback.explanation}</p>}
      <div className="vn-actions">
        <button type="button" className="btn btn-lg" onClick={onProceed} autoFocus>
          {t(feedback.retry ? "stories.tryAgain" : "stories.continue")} <Icon name="arrowRight" size={18} />
        </button>
      </div>
    </div>
  );
}
