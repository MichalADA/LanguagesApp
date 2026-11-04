import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnswerInput } from "@/components/AnswerInput";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import { useCourse } from "@/courses/CourseProvider";
import { useCurriculum } from "@/curriculum/CurriculumProvider";
import { fetchLessonContent } from "@/curriculum/repository";
import { CHEATSHEETS } from "@/grammar/cheatsheets";
import { chat, listModels, OllamaUnavailableError } from "./ollama";
import { buildMessages, isRealCorrection, openerTurn, parseTurn, serializeTurn, systemPrompt } from "./prompt";
import { findScenario, SCENARIOS } from "./scenarios";
import { readSettings, writeSettings } from "./settings";
import type { AssistantSettings, AssistantTurn, ChatMessage } from "./types";

type Connection = { state: "checking" } | { state: "ok"; models: string[] } | { state: "offline" } | { state: "error"; message: string };

interface Bubble {
  id: number;
  role: "user" | "assistant";
  text: string;
  /** Tylko asystent. */
  turn?: AssistantTurn;
  /** Tylko uczeń: poprawka z odpowiedzi, która przyszła po tej wiadomości. */
  correction?: { text: string; topic: string };
}

const MAX_WORDS = 30;

/** Głos chorwacki z przeglądarki (jeśli system go ma) — do odsłuchu odpowiedzi. */
function useCroatianVoice() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => setVoice(window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("hr")) ?? null);
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pick);
  }, []);
  const speak = useCallback(
    (text: string) => {
      if (!voice) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    },
    [voice],
  );
  return voice ? speak : null;
}

/** /rozmowa — rozmowa po chorwacku z modelem AI (dziś: Ollama na Twoim komputerze). */
export function AssistantPage() {
  const t = useT();
  const { course } = useCourse();
  const curriculum = useCurriculum();
  const [settings, setSettings] = useState<AssistantSettings>(readSettings);
  const [connection, setConnection] = useState<Connection>({ state: "checking" });
  const [recheck, setRecheck] = useState(0);
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = findScenario(scenarioId);
  const [bubbles, setBubbles] = useState<Bubble[]>(() => [{ id: 0, role: "assistant", text: scenario.opener.hr, turn: openerTurn(scenario) }]);
  const [history, setHistory] = useState<ChatMessage[]>(() => [{ role: "assistant", content: serializeTurn(openerTurn(scenario)) }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const [words, setWords] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null);
  const nextId = useRef(1);
  const logEnd = useRef<HTMLDivElement>(null);
  const speak = useCroatianVoice();

  // Bieżący poziom i moduł kursu (jak na pulpicie) — model mówi na tym poziomie i słowami z modułu.
  const levelIds = curriculum.outline?.levels.map((item) => item.id) ?? [];
  const view = curriculum.status === "ready" ? levelIds.map((id) => curriculum.levelView(id)).find((item) => item?.current) ?? null : null;
  const level = view?.level.id ?? "A1";
  const currentModule = view?.current?.module.module;

  useEffect(() => {
    if (!currentModule) return;
    let alive = true;
    Promise.all(currentModule.lessons.map((lesson) => fetchLessonContent(lesson.id)))
      .then((contents) => {
        if (!alive) return;
        const list = contents.flatMap((content) => content?.vocabulary.filter((word) => !word.optional).map((word) => word.target) ?? []);
        setWords([...new Set(list)].slice(0, MAX_WORDS));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [currentModule]);

  useEffect(() => {
    const controller = new AbortController();
    setConnection({ state: "checking" });
    listModels(settings, controller.signal)
      .then((models) => setConnection({ state: "ok", models }))
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setConnection(error instanceof OllamaUnavailableError ? { state: "offline" } : { state: "error", message: error.message });
      });
    return () => controller.abort();
  }, [settings, recheck]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [bubbles, busy]);

  useEffect(() => () => abort.current?.abort(), []);

  const system = useMemo(() => systemPrompt({ level, scenario, words }), [level, scenario, words]);
  const modelInstalled = connection.state === "ok" && connection.models.some((name) => name === settings.model || name === `${settings.model}:latest`);

  function updateSettings(next: AssistantSettings) {
    setSettings(next);
    writeSettings(next);
  }

  function restart(id = scenarioId) {
    abort.current?.abort();
    const next = findScenario(id);
    setScenarioId(next.id);
    setBubbles([{ id: nextId.current++, role: "assistant", text: next.opener.hr, turn: openerTurn(next) }]);
    setHistory([{ role: "assistant", content: serializeTurn(openerTurn(next)) }]);
    setShown({});
    setFailure(null);
    setBusy(false);
    setInput("");
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const userBubble: Bubble = { id: nextId.current++, role: "user", text };
    const nextHistory: ChatMessage[] = [...history, { role: "user", content: text }];
    setBubbles((prev) => [...prev, userBubble]);
    setHistory(nextHistory);
    setInput("");
    setBusy(true);
    setFailure(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const raw = await chat(settings, buildMessages(system, nextHistory), controller.signal);
      const turn = parseTurn(raw);
      setHistory((prev) => [...prev, { role: "assistant", content: serializeTurn(turn) }]);
      setBubbles((prev) => [
        ...prev.map((bubble) =>
          bubble.id === userBubble.id && isRealCorrection(text, turn.correction)
            ? { ...bubble, correction: { text: turn.correction, topic: turn.topic } }
            : bubble,
        ),
        { id: nextId.current++, role: "assistant", text: turn.reply, turn },
      ]);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setFailure(error instanceof OllamaUnavailableError ? t("assistant.offlineShort") : (error as Error).message);
      // Wiadomość ucznia zostaje w oknie, ale nie w historii dla modelu — można wysłać ponownie.
      setHistory((prev) => prev.slice(0, -1));
      setInput(text);
      setBubbles((prev) => prev.filter((bubble) => bubble.id !== userBubble.id));
    } finally {
      if (abort.current === controller) abort.current = null;
      setBusy(false);
    }
  }

  function cancel() {
    abort.current?.abort();
    abort.current = null;
    setBusy(false);
    // Bez odpowiedzi — ostatnia wiadomość ucznia wraca do pola, żeby jej nie zgubić.
    const last = bubbles[bubbles.length - 1];
    if (last?.role === "user") {
      setInput(last.text);
      setBubbles((prev) => prev.slice(0, -1));
      setHistory((prev) => prev.slice(0, -1));
    }
  }

  if (course.id !== "pl-hr") {
    return (
      <div className="page assistant-page">
        <header className="page-head">
          <h1>{t("assistant.title")}</h1>
          <p className="lede">{t("assistant.onlyCroatian")}</p>
        </header>
      </div>
    );
  }

  const ready = connection.state === "ok" && modelInstalled;
  const sheetTitle = (topic: string) => CHEATSHEETS.find((sheet) => sheet.id === topic)?.title;

  return (
    <div className="page assistant-page">
      <header className="page-head">
        <span className="eyebrow">{t("assistant.eyebrow", { level })}</span>
        <h1>{t("assistant.title")}</h1>
        <p className="lede">{t("assistant.lede")}</p>
      </header>

      <section className="assistant-status" aria-live="polite">
        {connection.state === "checking" && <span className="meta">{t("assistant.checking")}</span>}
        {connection.state === "ok" && modelInstalled && (
          <span className="assistant-pill ok">● {t("assistant.connected", { model: settings.model })}</span>
        )}
        {connection.state === "ok" && !modelInstalled && (
          <div className="inline-alert" role="alert">
            <span>{t("assistant.modelMissing", { model: settings.model })}</span>
            <code>ollama pull {settings.model}</code>
          </div>
        )}
        {(connection.state === "offline" || connection.state === "error") && (
          <div className="assistant-help" role="alert">
            <strong>{t("assistant.offlineTitle")}</strong>
            <p>{t("assistant.offlineText")}</p>
            <code>ollama serve</code>
            <p className="meta">{t("assistant.originsHint")}</p>
            {connection.state === "error" && <p className="meta">{connection.message}</p>}
            <button type="button" className="btn-ghost" onClick={() => setRecheck((n) => n + 1)}>
              {t("assistant.retry")}
            </button>
          </div>
        )}
        <details className="assistant-settings">
          <summary>{t("assistant.settings")}</summary>
          <label className="stack">
            <span className="meta">{t("assistant.model")}</span>
            {connection.state === "ok" && connection.models.length > 0 ? (
              <select value={settings.model} onChange={(event) => updateSettings({ ...settings, model: event.target.value })}>
                {!connection.models.includes(settings.model) && <option value={settings.model}>{settings.model}</option>}
                {connection.models.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : (
              <input value={settings.model} onChange={(event) => updateSettings({ ...settings, model: event.target.value })} />
            )}
          </label>
          <label className="stack">
            <span className="meta">{t("assistant.address")}</span>
            <input value={settings.baseUrl} onChange={(event) => updateSettings({ ...settings, baseUrl: event.target.value })} />
          </label>
        </details>
      </section>

      <div className="segmented assistant-scenarios" role="group" aria-label={t("assistant.scenario")}>
        {SCENARIOS.map((item) => (
          <button key={item.id} className={item.id === scenarioId ? "on" : ""} aria-pressed={item.id === scenarioId} onClick={() => restart(item.id)}>
            {t(`assistant.scenarios.${item.id}`)}
          </button>
        ))}
      </div>

      <section className="assistant-log" aria-label={t("assistant.log")}>
        {bubbles.map((bubble) =>
          bubble.role === "assistant" ? (
            <article key={bubble.id} className="assistant-bubble bot">
              <p lang="hr">{bubble.text}</p>
              <div className="assistant-tools">
                {bubble.turn?.translation && (
                  <button type="button" className="linklike" onClick={() => setShown((prev) => ({ ...prev, [bubble.id]: !prev[bubble.id] }))}>
                    {t(shown[bubble.id] ? "assistant.hideTranslation" : "assistant.showTranslation")}
                  </button>
                )}
                {speak && (
                  <button type="button" className="linklike" onClick={() => speak(bubble.text)}>
                    <Icon name="volume" size={14} /> {t("assistant.listen")}
                  </button>
                )}
              </div>
              {shown[bubble.id] && bubble.turn?.translation && <p className="muted" lang="pl">{bubble.turn.translation}</p>}
            </article>
          ) : (
            <article key={bubble.id} className="assistant-bubble me">
              <p lang="hr">{bubble.text}</p>
              {bubble.correction && (
                <div className="assistant-correction">
                  <span className="meta">{t("assistant.better")}</span>
                  <strong lang="hr">{bubble.correction.text}</strong>
                  {sheetTitle(bubble.correction.topic) && (
                    <Link className="text-link" to={`/gramatyka#${bubble.correction.topic}`}>
                      {t("assistant.sheet", { title: sheetTitle(bubble.correction.topic)! })} →
                    </Link>
                  )}
                </div>
              )}
            </article>
          ),
        )}
        {busy && (
          <p className="assistant-typing meta" role="status">
            {t("assistant.typing")}{" "}
            <button type="button" className="linklike" onClick={cancel}>{t("assistant.cancel")}</button>
          </p>
        )}
        {failure && <p className="assistant-failure" role="alert">{failure}</p>}
        <div ref={logEnd} />
      </section>

      <section className="assistant-compose">
        <AnswerInput
          value={input}
          onChange={setInput}
          onSubmit={() => void send()}
          placeholder={t("assistant.placeholder")}
          characters={course.specialCharacters}
          disabled={!ready || busy}
          focusKey={bubbles.length}
        />
        <div className="row assistant-actions">
          <button type="button" className="btn" disabled={!ready || busy || !input.trim()} onClick={() => void send()}>
            {t("assistant.send")} <Icon name="arrowRight" size={16} />
          </button>
          <button type="button" className="btn-ghost" onClick={() => restart()}>
            {t("assistant.restart")}
          </button>
        </div>
        <p className="meta">{t("assistant.disclaimer")}</p>
      </section>
    </div>
  );
}
