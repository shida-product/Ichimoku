import type { Category, EventItem, Task } from "@/lib/types";

/**
 * プレビュー（目視チェック）用のモックデータ。
 *
 * - フィールド名・型は本番（Supabase 配線後）のドメイン型と一致。
 * - 基準日は `src/lib/date.ts` の APP_TODAY（2026-06-15 / 月曜）。締切の緊急度や
 *   カレンダーの当日・今週表示が分かるよう、その週に分散させてある。
 * - `position` は字句順（'a'〜'z'）。セル内（カテゴリ×状態）で昇順になっていれば良い。
 *
 * 本番では使われない（`IS_PREVIEW` 経由でのみ注入）。
 */

const CAT_EIGYO = "cat-eigyo";
const CAT_DEV = "cat-dev";
const CAT_KEIRI = "cat-keiri";

export const MOCK_CATEGORIES: Category[] = [
  { id: CAT_EIGYO, name: "営業", position: "h", color: "#c2603f" },
  { id: CAT_DEV, name: "開発", position: "n", color: "#4f7a6f" },
  { id: CAT_KEIRI, name: "経理", position: "t", color: "#8a6d3b" },
];

export const MOCK_TASKS: Task[] = [
  // 営業
  {
    id: "task-1",
    categoryId: CAT_EIGYO,
    title: "A社へ見積もり提出",
    description: "前年度実績ベースで再見積もり。値引き条件は要相談。",
    links: [{ title: "見積テンプレ", url: "https://example.com/quote" }],
    status: "todo",
    position: "h",
    dueDate: "2026-06-16",
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-10T09:00:00",
    updatedAt: "2026-06-10T09:00:00",
  },
  {
    id: "task-2",
    categoryId: CAT_EIGYO,
    title: "月次の売上レポート確認",
    description: "",
    links: [],
    status: "doing",
    position: "h",
    dueDate: "2026-06-20",
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-11T10:00:00",
    updatedAt: "2026-06-12T14:00:00",
  },
  // 開発
  {
    id: "task-3",
    categoryId: CAT_DEV,
    title: "ログイン不具合の修正",
    description: "セッション切れ時にループする件。再現手順あり。",
    links: [
      { title: "Issue #42", url: "https://example.com/issue/42" },
      { title: "再現動画", url: "https://example.com/repro" },
    ],
    status: "todo",
    position: "h",
    dueDate: "2026-06-17",
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-12T11:00:00",
    updatedAt: "2026-06-12T11:00:00",
  },
  {
    id: "task-4",
    categoryId: CAT_DEV,
    title: "カレンダー週表示のレビュー",
    description: "",
    links: [],
    status: "doing",
    position: "h",
    dueDate: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-13T09:30:00",
    updatedAt: "2026-06-14T16:00:00",
  },
  {
    id: "task-5",
    categoryId: CAT_DEV,
    title: "本番ビルドの動作確認",
    description: "",
    links: [],
    status: "done",
    position: "h",
    dueDate: null,
    completedAt: "2026-06-14T18:00:00",
    archivedAt: null,
    createdAt: "2026-06-09T09:00:00",
    updatedAt: "2026-06-14T18:00:00",
  },
  // 経理
  {
    id: "task-6",
    categoryId: CAT_KEIRI,
    title: "請求書の発行（5月分）",
    description: "期限超過。至急対応。",
    links: [],
    status: "todo",
    position: "h",
    dueDate: "2026-06-10",
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-05T09:00:00",
    updatedAt: "2026-06-05T09:00:00",
  },
  {
    id: "task-7",
    categoryId: CAT_KEIRI,
    title: "経費精算のまとめ",
    description: "",
    links: [],
    status: "todo",
    position: "n",
    dueDate: "2026-06-30",
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-13T13:00:00",
    updatedAt: "2026-06-13T13:00:00",
  },
  // 未分類
  {
    id: "task-8",
    categoryId: null,
    title: "オフィス備品の発注",
    description: "プリンタのトナーが残りわずか。",
    links: [],
    status: "todo",
    position: "h",
    dueDate: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-14T15:00:00",
    updatedAt: "2026-06-14T15:00:00",
  },
];

export const MOCK_EVENTS: EventItem[] = [
  // 月曜 6/15（当日）— 重なりありで重なり配置を確認できる
  {
    id: "evt-1",
    title: "朝会",
    startAt: "2026-06-15T09:00:00",
    endAt: "2026-06-15T09:30:00",
    allDay: false,
    location: null,
    notes: null,
  },
  {
    id: "evt-2",
    title: "A社 商談",
    startAt: "2026-06-15T14:00:00",
    endAt: "2026-06-15T15:00:00",
    allDay: false,
    location: "本社 会議室A",
    notes: "見積もり提示",
  },
  {
    id: "evt-3",
    title: "開発レビュー",
    startAt: "2026-06-15T14:30:00",
    endAt: "2026-06-15T15:30:00",
    allDay: false,
    location: null,
    notes: null,
  },
  // 火曜 6/16
  {
    id: "evt-4",
    title: "週次定例",
    startAt: "2026-06-16T10:00:00",
    endAt: "2026-06-16T11:00:00",
    allDay: false,
    location: "オンライン",
    notes: null,
  },
  // 水曜 6/17
  {
    id: "evt-5",
    title: "ランチMTG",
    startAt: "2026-06-17T12:00:00",
    endAt: "2026-06-17T13:00:00",
    allDay: false,
    location: null,
    notes: null,
  },
  // 木曜 6/18 — 終日予定
  {
    id: "evt-6",
    title: "出張（大阪）",
    startAt: "2026-06-18T00:00:00",
    endAt: "2026-06-18T23:59:00",
    allDay: true,
    location: "大阪支社",
    notes: null,
  },
];
