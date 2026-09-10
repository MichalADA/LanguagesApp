import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import { fetchCroatianStations } from "./api";
import { filterStations } from "./helpers";
import type { RadioFilter, RadioStation } from "./types";

function StationLogo({ station }: { station: RadioStation }) {
  const [failed, setFailed] = useState(false);
  return <div className="radio-logo" aria-hidden="true">
    {station.favicon && !failed ? <img src={station.favicon} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span>♫</span>}
  </div>;
}

export function RadioPage() {
  const t = useT();
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RadioFilter>("all");
  const [selected, setSelected] = useState<RadioStation | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const generation = useRef(0);
  const connectionTimeout = useRef<ReturnType<typeof setTimeout>>();
  const clearConnectionTimeout = () => clearTimeout(connectionTimeout.current);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError(false);
    fetchCroatianStations(controller.signal).then(result => {
      if (!controller.signal.aborted) setStations(result);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const player = audio.current;
    return () => {
      generation.current++; clearConnectionTimeout();
      player?.pause(); player?.removeAttribute("src"); player?.load();
    };
  }, []);

  function fail() {
    clearConnectionTimeout(); setStreamError(true); setConnecting(false); setPlaying(false);
    audio.current?.pause();
  }

  function listen(station: RadioStation) {
    const player = audio.current;
    if (!player) return;
    const request = ++generation.current;
    clearConnectionTimeout(); player.pause();
    setSelected(station); setStreamError(false); setPlaying(false); setConnecting(true);
    player.src = station.url_resolved;
    player.load();
    connectionTimeout.current = setTimeout(() => { if (generation.current === request) fail(); }, 20000);
    void player.play().catch(() => { if (generation.current === request) fail(); });
  }

  function stop() {
    generation.current++; clearConnectionTimeout();
    audio.current?.pause(); audio.current?.removeAttribute("src"); audio.current?.load();
    setSelected(null); setStreamError(false); setConnecting(false); setPlaying(false);
  }

  const visible = useMemo(() => filterStations(stations, query, filter), [stations, query, filter]);
  return <div className="page radio-page">
    <header className="page-head">
      <span className="eyebrow">{t("gameCategories.radio.name")}</span>
      <h1>{t("radio.title")}</h1>
      <p className="lede">{t("radio.description")}</p>
      <Link className="mono dim" to="/gry">{t("games.backToModes")}</Link>
    </header>

    <section className="panel panel-pad radio-player stack" aria-label={t("radio.player")}>
      <div aria-live="polite">
        <p className="eyebrow">{t("radio.nowPlaying")}</p>
        <h2>{selected?.name ?? t("radio.choose")}</h2>
        {connecting && <p role="status">{t("radio.connecting")}</p>}
        {streamError && <p role="alert">{t("radio.streamError")}</p>}
      </div>
      <audio ref={audio} controls preload="none" aria-label={t("radio.player")}
        onPlaying={() => { clearConnectionTimeout(); setPlaying(true); setConnecting(false); setStreamError(false); }}
        onPause={() => setPlaying(false)} onError={() => { if (audio.current?.getAttribute("src")) fail(); }} />
      <div className="row radio-actions">
        <button className="btn" disabled={!selected} onClick={() => {
          if (playing) { generation.current++; clearConnectionTimeout(); audio.current?.pause(); setConnecting(false); }
          else if (selected) listen(selected);
        }}>{t(playing ? "radio.pause" : "radio.play")}</button>
        <button className="btn-ghost" disabled={!selected} onClick={stop}>{t("radio.stop")}</button>
      </div>
    </section>

    <section className="radio-filters stack" aria-label={t("radio.filters")}>
      <label className="stack" htmlFor="radio-search">{t("radio.search")}
        <input id="radio-search" className="login-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("radio.search")} />
      </label>
      <div className="row radio-actions">
        {(["all", "talk", "music"] as const).map(value => <button key={value} className={filter === value ? "btn" : "btn-ghost"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{t(`radio.${value}`)}</button>)}
      </div>
    </section>
    {loading ? <p role="status">{t("radio.loading")}</p> : loadError ? <div className="panel panel-pad stack">
      <p role="alert">{t("radio.loadError")}</p><button className="btn" onClick={() => setReload(value => value + 1)}>{t("radio.retry")}</button>
    </div> : <>
      <p className="dim" role="status">{visible.length ? t("radio.count", { n: visible.length }) : t("radio.empty")}</p>
      <div className="grid grid-3 radio-stations">
        {visible.map(station => <article key={station.stationuuid} className={`panel panel-pad radio-card${selected?.stationuuid === station.stationuuid ? " selected" : ""}`}>
          <div className="radio-heading"><StationLogo key={station.favicon} station={station} /><div><h2>{station.name}</h2>{station.state && <p className="dim">{station.state}</p>}</div></div>
          <div className="radio-tags">{station.tags.slice(0, 8).map(tag => <span className="badge" key={tag}>{tag}</span>)}</div>
          <p className="mono dim">{[station.codec, station.bitrate ? `${station.bitrate} kbps` : ""].filter(Boolean).join(" · ") || t("radio.unknownFormat")}</p>
          <button className="btn" aria-label={t("radio.listenTo", { name: station.name })} onClick={() => listen(station)}>{t("radio.listen")}</button>
        </article>)}
      </div>
    </>}
    <p className="stat-note">{t("radio.source")} <a href="https://www.radio-browser.info/" target="_blank" rel="noreferrer">Radio-Browser</a></p>
  </div>;
}
