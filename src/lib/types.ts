/**
 * ドメイン型（Supabase スキーマと整合）。
 * 現段階はメモリ内モックストアで使うが、フィールド名は DB（supabase/migrations）に
 * 合わせてあり、後で Supabase 配線へ差し替えやすくしている。
 */

/** タスクの状態（DB: tasks.status） */
export type TaskStatus = "todo" | "doing" | "done";

/** 状態の表示順と日本語ラベル */
export const STATUS_ORDER: TaskStatus[] = ["todo", "doing", "done"];

/**
 * ボードのカラムに並べる「作業中」の状態（未着手・対応中）。
 * `done` は各レーンの列ではなく共有の完了ドロップゾーンへ集約するため除外する。
 */
export const WORKING_STATUSES: TaskStatus[] = ["todo", "doing"];
export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "未着手",
  doing: "対応中",
  done: "完了",
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
  position: string;
  dueDate: string | null; // 'YYYY-MM-DD'。null = 締切なし
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
}

/** 締切の緊急度（近日締切レーン・締切チップの色分け） */
export type DueUrgency = "crit" | "warn" | "calm";
