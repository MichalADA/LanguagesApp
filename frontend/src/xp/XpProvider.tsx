import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import type { DailyGoal, XpSource } from "./goals";
import type { XpSummary } from "./ledger";
import { awardXp, loadXp, saveGoal } from "./repository";

interface XpContextValue {
  status: "loading" | "ready" | "error";
  summary: XpSummary | null;
  /** Zdarzenia XP czekające na wysyłkę (błąd sieci). */
  pending: number;
  award: (input: { courseId: string; source: XpSource; sourceId: string; xp: number }) => Promise<void>;
  setGoal: (goal: DailyGoal) => Promise<void>;
  reload: () => void;
}

const XpContext = createContext<XpContextValue | null>(null);

/** XP konta i dzienny cel — wspólne dla lekcji, Stories i powtórek. Gość: lokalnie, konto: backend. */
export function XpProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus, apiRequest } = useAuth();
  const owner = user?.id ?? "guest";
  const request = authStatus === "authenticated" ? apiRequest : undefined;
  const [summary, setSummary] = useState<XpSummary | null>(null);
  const [pending, setPending] = useState(0);
  const [status, setStatus] = useState<XpContextValue["status"]>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (authStatus === "loading") return;
    let alive = true;
    setStatus("loading");
    loadXp({ owner, request })
      .then((loaded) => {
        if (!alive) return;
        setSummary(loaded.summary);
        setPending(loaded.pending);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [owner, request, authStatus, attempt]);

  const award = useCallback<XpContextValue["award"]>(
    async (input) => {
      const result = await awardXp({ owner, request }, input);
      if (result.summary) setSummary(result.summary);
      setPending(result.pending);
    },
    [owner, request],
  );

  const setGoal = useCallback(
    async (goal: DailyGoal) => {
      setSummary(await saveGoal({ owner, request }, goal));
    },
    [owner, request],
  );

  const value = useMemo(() => ({ status, summary, pending, award, setGoal, reload: () => setAttempt((n) => n + 1) }), [status, summary, pending, award, setGoal]);
  return <XpContext.Provider value={value}>{children}</XpContext.Provider>;
}

export function useXp(): XpContextValue {
  const value = useContext(XpContext);
  if (!value) throw new Error("useXp must be used inside XpProvider");
  return value;
}
