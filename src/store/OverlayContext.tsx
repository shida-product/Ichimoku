import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * OverlayContext — オーバーレイ状態の一元管理（§3.7「常に 1 枚だけ」）。
 *
 * どのコンポーネント（タスクカード・締切チップ等）からでも開閉でき、
 * 新しく開く＝前を閉じる、を構造的に保証する（active は単一の union）。
 */
export type ActiveOverlay =
  | { kind: "none" }
  | { kind: "task"; taskId: string }
  | { kind: "category" }
  | { kind: "eventAdd" }
  | { kind: "event"; eventId: string };

interface OverlayContextValue {
  active: ActiveOverlay;
  openTask: (taskId: string) => void;
  openCategory: () => void;
  openEventAdd: () => void;
  openEvent: (eventId: string) => void;
  close: () => void;
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveOverlay>({ kind: "none" });

  const openTask = useCallback((taskId: string) => setActive({ kind: "task", taskId }), []);
  const openCategory = useCallback(() => setActive({ kind: "category" }), []);
  const openEventAdd = useCallback(() => setActive({ kind: "eventAdd" }), []);
  const openEvent = useCallback((eventId: string) => setActive({ kind: "event", eventId }), []);
  const close = useCallback(() => setActive({ kind: "none" }), []);

  const value = useMemo<OverlayContextValue>(
    () => ({ active, openTask, openCategory, openEventAdd, openEvent, close }),
    [active, openTask, openCategory, openEventAdd, openEvent, close]
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOverlay(): OverlayContextValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay は OverlayProvider 内で使用してください");
  return ctx;
}
