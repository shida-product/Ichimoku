import { createContext, useContext, useMemo, useState } from "react";

/**
 * 近日締切レーン ⇄ タスクボード／カレンダーのホバー連動用の最小コンテキスト。
 * 締切カードにホバーすると、ボード上の同一タスク（highlightId）と
 * カレンダー上の該当締切日（highlightDate）を同時にハイライトする。
 */
type HighlightCtx = {
  highlightId: string | null;
  setHighlightId: (id: string | null) => void;
  /** ハイライト中の締切日（'YYYY-MM-DD'）。カレンダー側で該当日を強調する。 */
  highlightDate: string | null;
  setHighlightDate: (date: string | null) => void;
};

const Ctx = createContext<HighlightCtx | null>(null);

export function HighlightProvider({ children }: { children: React.ReactNode }) {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  const value = useMemo(
    () => ({ highlightId, setHighlightId, highlightDate, setHighlightDate }),
    [highlightId, highlightDate]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHighlight(): HighlightCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHighlight は HighlightProvider 内で使ってください");
  return ctx;
}
