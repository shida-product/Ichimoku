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
  // 予定は保存ボタン式（option B）。eventId=null が新規登録、文字列が既存編集。
  // initialDate は新規時に初期選択する日付（'YYYY-MM-DD'、＋を押した日）。
  | { kind: "event"; eventId: string | null; initialDate?: string }
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
  /** 予定を新規登録で開く（保存ボタン式）。initialDate で初期日付を指定可。 */
  openEventCreate: (initialDate?: string) => void;
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
  const openEvent = useCallback((eventId: string) => setActive({ kind: "event", eventId }), []);
  const openEventCreate = useCallback(
    (initialDate?: string) => setActive({ kind: "event", eventId: null, initialDate }),
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
      openEventCreate,
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
      openEventCreate,
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
