import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * OverlayContext — オーバーレイ状態の一元管理（§3.7「常に 1 枚だけ」）。
 *
 * 追加と編集は同一の side-peek 詳細パネルに一本化する。追加時は空の下書きを
 * 作ってからそのパネルを開くため、`draft` フラグで「空のまま閉じたら破棄」を判定する。
 */
export type ActiveOverlay =
  | { kind: "none" }
  | { kind: "task"; taskId: string; draft: boolean }
  | { kind: "category" }
  | { kind: "event"; eventId: string; draft: boolean }
  | { kind: "history" }
  | { kind: "shiftTypes" };

interface OverlayContextValue {
  active: ActiveOverlay;
  /** 既存タスクを編集で開く */
  openTask: (taskId: string) => void;
  /** 追加した下書きタスクを開く */
  openTaskDraft: (taskId: string) => void;
  openCategory: () => void;
  /** 既存予定を編集で開く */
  openEvent: (eventId: string) => void;
  /** 追加した下書き予定を開く */
  openEventDraft: (eventId: string) => void;
  /** 完了履歴（アーカイブ）を開く */
  openHistory: () => void;
  /** 勤務地（シフト種別）管理を開く */
  openShiftTypes: () => void;
  close: () => void;
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveOverlay>({ kind: "none" });

  const openTask = useCallback(
    (taskId: string) => setActive({ kind: "task", taskId, draft: false }),
    []
  );
  const openTaskDraft = useCallback(
    (taskId: string) => setActive({ kind: "task", taskId, draft: true }),
    []
  );
  const openCategory = useCallback(() => setActive({ kind: "category" }), []);
  const openEvent = useCallback(
    (eventId: string) => setActive({ kind: "event", eventId, draft: false }),
    []
  );
  const openEventDraft = useCallback(
    (eventId: string) => setActive({ kind: "event", eventId, draft: true }),
    []
  );
  const openHistory = useCallback(() => setActive({ kind: "history" }), []);
  const openShiftTypes = useCallback(() => setActive({ kind: "shiftTypes" }), []);
  const close = useCallback(() => setActive({ kind: "none" }), []);

  const value = useMemo<OverlayContextValue>(
    () => ({
      active,
      openTask,
      openTaskDraft,
      openCategory,
      openEvent,
      openEventDraft,
      openHistory,
      openShiftTypes,
      close,
    }),
    [
      active,
      openTask,
      openTaskDraft,
      openCategory,
      openEvent,
      openEventDraft,
      openHistory,
      openShiftTypes,
      close,
    ]
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOverlay(): OverlayContextValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay は OverlayProvider 内で使用してください");
  return ctx;
}
