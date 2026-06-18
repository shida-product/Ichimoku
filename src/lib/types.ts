/**
 * ドメイン型（Supabase スキーマと整合）。
 * 現段階はメモリ内モックストアで使うが、フィールド名は DB（supabase/migrations）に
 * 合わせてあり、後で Supabase 配線へ差し替えやすくしている。
 */

/**
 * タスクの状態（DB: tasks.status）。
 *
 * 画面構成見直し（案B）以降、ボードは状態で列分割しない単一リストになり、
 * `doing` は「対応中フラグ（★）」として表現する（列ではなくカード上の印）。
 * `done` はドロップで即アーカイブされ、ボードからは消えて完了履歴に集約される。
 */
export type TaskStatus = "todo" | "doing" | "done";

/** 状態の表示順と日本語ラベル */
export const STATUS_ORDER: TaskStatus[] = ["todo", "doing", "done"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "未着手",
  doing: "対応中",
  done: "完了",
};

/** `doing` を「対応中フラグが立っている」とみなすヘルパー（案B）。 */
export function isFlagged(status: TaskStatus): boolean {
  return status === "doing";
}

/** タスクの優先度（DB: tasks.priority）。既定は `normal`。 */
export type TaskPriority = "high" | "normal" | "low";

/** 優先度の表示順（高→低）と日本語ラベル */
export const PRIORITY_ORDER: TaskPriority[] = ["high", "normal", "low"];

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "高",
  normal: "中",
  low: "低",
};

/** タスクのリンク（DB: tasks.links JSONB の各要素） */
export interface TaskLink {
  title: string; // ラベル（任意）
  url: string;
}

/** カテゴリ（DB: categories） */
export interface Category {
  id: string;
  name: string;
  position: string; // fractional index（モックでは単純な連番文字列）
  color: string | null; // 未設定時は標準カテゴリ色へフォールバック
}

/** タスク（DB: tasks） */
export interface Task {
  id: string;
  categoryId: string | null; // null = 未分類
  title: string;
  description: string; // メモ（プレーンテキスト）
  links: TaskLink[];
  status: TaskStatus;
  priority: TaskPriority; // 優先度（既定 'normal'）
  position: string;
  dueDate: string | null; // 'YYYY-MM-DD'。null = 締切なし
  dueTime: string | null; // 'HH:mm'。null = 時刻指定なし（dueDate がある時のみ意味を持つ）
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 予定（DB: events） */
export interface EventItem {
  id: string;
  title: string;
  startAt: string; // ISO 文字列
  endAt: string;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  color: string | null; // 分類色スロット "cat-N"。null = 既定色（テーマの primary 系アクセント）
}

/** 締切の緊急度（近日締切レーン・締切チップの色分け） */
export type DueUrgency = "crit" | "warn" | "calm";

/**
 * 勤務地・シフト種別のマスタ（DB: shift_types）。
 * 渋谷店 / 恵比寿店 / りんご / 休み など、ユーザー定義の固定セット。カテゴリと同型。
 */
export interface ShiftType {
  id: string;
  name: string;
  color: string | null; // チップ色。未設定時は標準色へフォールバック
  position: string; // 並び順（fractional index）
}

/**
 * 日へのシフト割当（DB: shifts）。1日1件（unique(owner_id, date)）。
 * カレンダー各日の見出しに色付きチップで表示する。
 */
export interface Shift {
  id: string;
  date: string; // 'YYYY-MM-DD'
  shiftTypeId: string;
}
