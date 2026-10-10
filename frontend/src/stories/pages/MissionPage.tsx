import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { AudioButton } from "@/components/AudioButton";
import { Icon } from "@/components/Icon";
import { useCourse } from "@/courses/CourseProvider";
import { useT } from "@/i18n";
import { useProgress } from "@/progress/ProgressProvider";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import type { Verdict as AnswerVerdict } from "@/services/validation";
import { Art, Portrait } from "../art/registry";
import { currentNode, markHint, scoreOf, scriptedDriver, type PlayerInput, type RunState, type WorldContext } from "../engine";
import { audioFor, enrollMissionVocabulary, reportPractice } from "../integration";
import { completedIds, missionStatus, nextMission } from "../progress";
import type { SavedCompletion } from "../repository";
import { DialogueScene } from "../components/DialogueScene";
import { useStory } from "../useStory";
import { StoryStateView } from "./StoryStateView";

type Phase = "briefing" | "playing" | "saving" | "result";

/**
 * /stories/:storyId/:missionId — tryb skupienia (bez menu aplikacji, jak lekcja):
 * odprawa → rozmowa → podsumowanie. Postęp zapisuje się po ukończeniu misji.
 */
export function MissionPage() {
  const t = useT();
  const navigate = useNavigate();
  const { storyId, missionId } = useParams();
  const data = useStory(storyId);
  const { story, progress } = data;
  const { course } = useCourse();
  const { apiRequest } = useAuth();
  const { entries } = useVocabulary();
  const { recordRound } = useProgress();
  const mission = story?.missions.find((m) => m.id === missionId) ?? null;
  const [phase, setPhase] = useState<Phase>("briefing");
  const [run, setRun] = useState<RunState | null>(null);
  const [saved, setSaved] = useState<SavedCompletion | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [audio, setAudio] = useState<Record<string, { female?: string; male?: string }>>({});
  const nodeStarted = useRef(Date.now());
  /** Wyniki zadań ze wskazanym słowem — do statystyk gościa (FSRS wysyła się na bieżąco). */
  const practiceLog = useRef<{ itemId: string; verdict: AnswerVerdict }[]>([]);

  useEffect(() => {
    let alive = true;
    data.entry?.loadAudio?.().then((map) => alive && setAudio(map)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [data.entry]);

  const world: WorldContext | null = useMemo(
    () => (progress ? { flags: progress.flags, completed: completedIds(progress), vars: { name: data.playerName } } : null),
    [progress, data.playerName],
  );
  const driver = useMemo(() => (mission ? scriptedDriver(mission.dialogue.graph, course.validation) : null), [mission, course.validation]);
  const alreadyCompleted = Boolean(progress && mission && completedIds(progress).includes(mission.id));

  const start = () => {
    if (!driver || !world) return;
    practiceLog.current = [];
    setSaved(null);
    setSaveError(false);
    nodeStarted.current = Date.now();
    setRun(driver.start(world));
    setPhase("playing");
  };

  const finish = useCallback(
    async (finalRun: RunState) => {
      if (!mission || !story) return;
      setPhase("saving");
      setSaveError(false);
      const score = scoreOf(finalRun).percent;
      try {
        const result = await data.complete(mission, score, finalRun.flags);
        setSaved(result);
        await enrollMissionVocabulary(data.owner, story, mission, data.authenticated ? apiRequest : null);
        // Statystyki i dzień aktywności — ten sam zapis co inne gry (słowa ze słownika kursu).
        const byId = new Map(entries.map((e) => [e.id, e]));
        recordRound({
          gameId: "stories",
          score: result?.xpAwarded ?? 0,
          answered: practiceLog.current.flatMap((p) => (byId.get(p.itemId) ? [{ entry: byId.get(p.itemId)!, verdict: p.verdict }] : [])),
        });
        setPhase("result");
      } catch {
        setSaveError(true);
        setPhase("saving");
      }
    },
    [mission, story, data, apiRequest, entries, recordRound],
  );

  const answer = useCallback(
    (input: PlayerInput) => {
      if (!driver || !world || !run || !mission) return;
      const before = currentNode(mission.dialogue.graph, run);
      const next = driver.answer(run, input, world);
      if (next === run) return;
      // Pierwsza próba w zadaniu produkcyjnym ze wskazanym słowem → FSRS / statystyki.
      if ((before.kind === "build" || before.kind === "type") && before.practice && !(before.id in run.firstTry) && input.kind === "text") {
        const correct = next.firstTry[before.id];
        const near = next.pending?.feedback.verdict === "near";
        const word = mission.vocabulary.find((w) => w.hr === before.practice);
        if (word) practiceLog.current.push({ itemId: word.review.itemId, verdict: correct ? (near ? "near" : "hit") : "miss" });
        if (data.authenticated && !alreadyCompleted) {
          void reportPractice(apiRequest, course.id, mission, before, {
            answer: input.value,
            correct,
            near,
            usedHint: Boolean(run.hints[before.id]),
            responseTimeMs: Date.now() - nodeStarted.current,
          }).catch(() => undefined);
        }
      }
      setRun(next);
      if (!next.pending) nodeStarted.current = Date.now();
      if (next.finished) void finish(next);
    },
    [driver, world, run, mission, data.authenticated, alreadyCompleted, apiRequest, course.id, finish],
  );

  const proceed = useCallback(() => {
    if (!driver || !world || !run) return;
    const next = driver.proceed(run, world);
    nodeStarted.current = Date.now();
    setRun(next);
    if (next.finished) void finish(next);
  }, [driver, world, run, finish]);

  if (data.status !== "ready" || !story || !progress) return <StoryStateView status={data.status} onRetry={data.reload} />;
  if (!mission) return <StoryStateView status="missing" onRetry={data.reload} />;

  const status = missionStatus(story, progress, mission);
  const cityHref = `/stories/${story.id}`;
  const npc = story.npcs.find((n) => n.id === mission.npcId)!;
  const location = story.locations.find((l) => l.id === mission.locationId)!;

  if (status === "locked") {
    return (
      <div className="vn vn-static">
        <div className="vn-bg">
          <Art id={location.background} />
        </div>
        <div className="vn-card">
          <Icon name="lock" size={22} />
          <h1>{t("stories.lockedMission")}</h1>
          <p className="muted">{t("stories.requires", { mission: mission.requires.map((id) => story.missions.find((m) => m.id === id)?.title.hr).join(", ") })}</p>
          <Link className="btn" to={cityHref}>
            {t("stories.backToCity", { city: story.city.hr })}
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "playing" && run && world) {
    return (
      <DialogueScene
        story={story}
        mission={mission}
        run={run}
        world={world}
        audio={audio}
        xp={progress.xp}
        onAnswer={answer}
        onProceed={proceed}
        onHint={() => setRun((r) => (r ? markHint(r) : r))}
        onExit={() => navigate(cityHref)}
      />
    );
  }

  if (phase === "saving") {
    return (
      <div className="vn vn-static">
        <div className="vn-bg">
          <Art id={location.background} />
        </div>
        <div className="vn-card" role={saveError ? "alert" : "status"}>
          {saveError ? (
            <>
              <h1>{t("stories.saveError")}</h1>
              <button type="button" className="btn" onClick={() => run && void finish(run)}>
                {t("stories.retry")}
              </button>
            </>
          ) : (
            <p>{t("stories.saving")}</p>
          )}
        </div>
      </div>
    );
  }

  if (phase === "result" && run) {
    const score = scoreOf(run);
    const next = nextMission(story, progress);
    return (
      <div className="vn vn-static">
        <div className="vn-bg">
          <Art id={location.background} />
        </div>
        <article className="vn-card vn-result">
          <span className="vn-result-portrait">
            <Portrait id={npc.portrait} mood="happy" />
          </span>
          <span className="eyebrow">
            {t("stories.missionChip", { n: String(mission.order).padStart(2, "0") })} · {t("stories.complete")}
          </span>
          <h1 className="target">{mission.title.hr}</h1>
          <div className="vn-result-score">
            <strong>{score.percent}%</strong>
            <span className="muted">{t("stories.firstTry", { correct: score.correct, total: score.total })}</span>
          </div>
          <p className={saved?.firstCompletion ? "vn-reward" : "vn-reward muted"}>
            {saved?.firstCompletion ? t("stories.rewardGained", { xp: saved.xpAwarded }) : t("stories.rewardReplay")}
          </p>
          {saved && saved.pending > 0 && <p className="meta">{t("stories.pendingSync", { n: saved.pending })}</p>}
          <section>
            <span className="eyebrow">{t("stories.learned")}</span>
            <ul className="vn-debrief">
              {mission.debrief.map((item) => (
                <li key={item}>
                  <Icon name="check" size={14} /> {item}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <span className="eyebrow">{t("stories.vocabulary")}</span>
            <ul className="summary-words">
              {mission.vocabulary.map((w) => (
                <li key={w.hr}>
                  <span className="target">
                    {w.hr} <AudioButton src={audioFor(audio, w.hr)} text={w.hr} size="sm" />
                  </span>
                  <span className="muted">{w.pl}</span>
                </li>
              ))}
            </ul>
            <p className="meta">{t(data.authenticated ? "stories.vocabFsrs" : "stories.vocabGuest")}</p>
          </section>
          <div className="summary-actions">
            {next ? (
              <Link className="btn btn-lg" to={`/stories/${story.id}/${next.id}`} onClick={() => setPhase("briefing")}>
                {t("stories.nextMission", { title: next.title.hr })} <Icon name="arrowRight" size={18} />
              </Link>
            ) : (
              <Link className="btn btn-lg" to={cityHref}>
                {t("stories.backToCity", { city: story.city.hr })} <Icon name="arrowRight" size={18} />
              </Link>
            )}
            {next && (
              <Link className="btn-ghost" to={cityHref}>
                {t("stories.backToCity", { city: story.city.hr })}
              </Link>
            )}
            <button type="button" className="btn-ghost" onClick={start}>
              {t("stories.replay")}
            </button>
          </div>
        </article>
      </div>
    );
  }

  // Odprawa
  return (
    <div className="vn vn-static">
      <div className="vn-bg">
        <Art id={location.background} />
      </div>
      <article className="vn-card vn-briefing">
        <span className="vn-result-portrait">
          <Portrait id={npc.portrait} mood="happy" title={npc.name} />
        </span>
        <span className="eyebrow">
          {story.city.hr} · {location.name.hr} · {t("stories.missionChip", { n: String(mission.order).padStart(2, "0") })}
        </span>
        <h1 className="target">{mission.title.hr}</h1>
        <p className="muted">{mission.title.pl}</p>
        <p className="vn-story">{mission.story}</p>
        <p>
          <strong>{t("stories.goal")}:</strong> {mission.goal}
        </p>
        <ul className="vn-debrief">
          {mission.objectives.map((o) => (
            <li key={o.text}>○ {o.text}</li>
          ))}
        </ul>
        <p className="meta">
          {status === "completed" ? t("stories.replayNote") : t("stories.reward", { xp: mission.xp })} · {t("stories.helpNote")}
        </p>
        <div className="summary-actions">
          <button type="button" className="btn btn-lg" onClick={start} autoFocus>
            {t(status === "completed" ? "stories.replay" : "stories.start")} <Icon name="arrowRight" size={18} />
          </button>
          <Link className="btn-ghost" to={cityHref}>
            {t("stories.backToCity", { city: story.city.hr })}
          </Link>
        </div>
      </article>
    </div>
  );
}
