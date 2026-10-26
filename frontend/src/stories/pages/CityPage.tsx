import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import { Art, MAPS, Portrait } from "../art/registry";
import { completedIds, isLocationUnlocked, missionStatus, nextMission } from "../progress";
import type { StoryLocation } from "../types";
import { useStory } from "../useStory";
import { StoryStateView } from "./StoryStateView";

/**
 * /stories/:storyId — mapa miasta jako interaktywny hub: lokacje z pinezkami, status odblokowania,
 * postacie i misje. Bez chodzenia postacią — wybór lokacji otwiera jej panel.
 */
export function CityPage() {
  const t = useT();
  const { storyId } = useParams();
  const data = useStory(storyId);
  const { story, progress } = data;
  const [selected, setSelected] = useState<string | null>(null);

  const next = story && progress ? nextMission(story, progress) : null;
  useEffect(() => {
    if (story && !selected) setSelected(next?.locationId ?? story.locations[0].id);
  }, [story, next, selected]);

  if (data.status !== "ready" || !story || !progress) return <StoryStateView status={data.status} onRetry={data.reload} />;

  const done = completedIds(progress);
  const location = story.locations.find((l) => l.id === selected) ?? story.locations[0];

  return (
    <div className="page page-wide stories-city-page">
      <header className="stories-city-head">
        <div>
          <Link to="/stories" className="text-link">
            <Icon name="arrowLeft" size={14} /> {t("stories.allCities")}
          </Link>
          <h1 className="display">
            {story.city.hr} <span className="badge on">{story.level}</span>
          </h1>
          <p className="lede">{story.tagline}</p>
        </div>
        <dl className="stories-stats">
          <div>
            <dt>{t("stories.missions")}</dt>
            <dd>
              {done.length} / {story.missions.length}
            </dd>
          </div>
          <div>
            <dt>XP</dt>
            <dd>★ {progress.xp}</dd>
          </div>
        </dl>
      </header>

      {data.pending > 0 && <p className="inline-alert" role="status">{t("stories.pendingSync", { n: data.pending })}</p>}

      <div className="stories-city-layout">
        <section className="stories-map panel" aria-label={t("stories.mapLabel", { city: story.city.hr })}>
          <Art id={story.map} registry={MAPS} />
          <ul className="stories-pins">
            {story.locations.map((l) => (
              <MapPin key={l.id} location={l} unlocked={isLocationUnlocked(l, progress)} active={l.id === location.id} hasNext={next?.locationId === l.id} onSelect={() => setSelected(l.id)} />
            ))}
          </ul>
        </section>

        <aside className="stories-location panel panel-pad" aria-live="polite">
          {locationPanel(story.id, location)}
        </aside>
      </div>
      {story.languageReview === "unverified" && <p className="meta stories-review-note">{t("stories.unverified")}</p>}
    </div>
  );

  function locationPanel(sid: string, l: StoryLocation) {
    const unlocked = isLocationUnlocked(l, progress!);
    const missions = story!.missions.filter((m) => m.locationId === l.id).sort((a, b) => a.order - b.order);
    const npcs = story!.npcs.filter((n) => missions.some((m) => m.npcId === n.id));
    return (
      <>
        <div className="stories-location-head">
          <span className="eyebrow">{l.name.pl}</span>
          <h2>{l.name.hr}</h2>
          <p className="muted">{l.description}</p>
        </div>
        {l.comingSoon ? (
          <p className="badge">{t("common.soon")}</p>
        ) : !unlocked ? (
          <p className="stories-locked">
            <Icon name="lock" size={16} /> {t("stories.lockedLocation")}
          </p>
        ) : (
          <>
            {npcs.map((n) => (
              <div key={n.id} className="stories-npc">
                <span className="stories-npc-portrait">
                  <Portrait id={n.portrait} mood="happy" />
                </span>
                <span>
                  <strong>{n.name}</strong>
                  <span className="muted"> · {n.role}</span>
                </span>
              </div>
            ))}
            <ol className="stories-missions">
              {missions.map((m) => {
                const state = missionStatus(story!, progress!, m);
                const record = progress!.missions.find((r) => r.missionId === m.id);
                return (
                  <li key={m.id} className={`stories-mission ${state}`}>
                    <span className="stories-mission-mark" aria-hidden="true">
                      {state === "completed" ? <Icon name="check" size={14} /> : state === "locked" ? <Icon name="lock" size={13} /> : String(m.order).padStart(2, "0")}
                    </span>
                    <span className="stories-mission-body">
                      <strong className="target">{m.title.hr}</strong>
                      <span className="muted">{m.goal}</span>
                      <span className="meta">
                        {state === "completed"
                          ? t("stories.completedMeta", { score: record?.bestScore ?? 0, plays: record?.plays ?? 1 })
                          : state === "locked"
                            ? t("stories.requires", { mission: m.requires.map((id) => story!.missions.find((x) => x.id === id)?.title.hr).join(", ") })
                            : t("stories.reward", { xp: m.xp })}
                      </span>
                    </span>
                    {state !== "locked" && (
                      <Link className={state === "available" ? "btn" : "btn-ghost"} to={`/stories/${sid}/${m.id}`}>
                        {t(state === "available" ? "stories.play" : "stories.replay")}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </>
    );
  }
}

function MapPin({ location, unlocked, active, hasNext, onSelect }: { location: StoryLocation; unlocked: boolean; active: boolean; hasNext: boolean; onSelect: () => void }) {
  const t = useT();
  const state = location.comingSoon ? "soon" : unlocked ? "open" : "locked";
  const label = `${location.name.hr} — ${location.name.pl}${state === "soon" ? ` (${t("common.soon")})` : state === "locked" ? ` (${t("stories.locked")})` : ""}`;
  return (
    <li className={`stories-pin ${state}${active ? " active" : ""}${hasNext ? " next" : ""}`} style={{ left: `${location.map.x}%`, top: `${location.map.y}%` }}>
      <button type="button" onClick={onSelect} aria-pressed={active} aria-label={label}>
        <span className="stories-pin-dot" aria-hidden="true">
          {state === "locked" ? <Icon name="lock" size={12} /> : state === "soon" ? "…" : <Icon name="route" size={13} />}
        </span>
        <span className="stories-pin-label">{location.name.hr}</span>
      </button>
    </li>
  );
}
