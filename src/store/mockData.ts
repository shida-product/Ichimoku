import type { Category, EventItem, Shift, ShiftType, Task } from "@/lib/types";

/**
 * プレビュー（目視チェック）用のモックデータ。
 *
 * - フィールド名・型は本番（Supabase 配線後）のドメイン型と一致。
 * - 基準日は `src/lib/date.ts` の APP_TODAY（2026-06-15 / 月曜）。締切の緊急度や
 *   カレンダーの当日・今週表示が分かるよう、その週前後に分散させてある。
 * - `position` は字句順。カテゴリ（×状態は廃止）内で昇順なら良い。
 * - **実機想定**: カテゴリは 5 つ＋未分類。各カテゴリのタスク数を不揃いにし、
 *   メモ有無・締切・★フラグも散らして、列の高さ／カードの高さがバラつくようにしてある
 *   （列分配マソンリーの見え方を確認するため）。
 *
 * 本番では使われない（`IS_PREVIEW` 経由でのみ注入）。
 */

const CAT_EIGYO = "cat-eigyo";
const CAT_DEV = "cat-dev";
const CAT_KEIRI = "cat-keiri";
const CAT_SAIYO = "cat-saiyo";
const CAT_SOMU = "cat-somu";

export const MOCK_CATEGORIES: Category[] = [
  // 色は Google 採用パレットのスロット参照（"cat-N"）。
  { id: CAT_EIGYO, name: "営業", position: "c", color: "cat-1" },
  { id: CAT_DEV, name: "開発", position: "f", color: "cat-4" },
  { id: CAT_KEIRI, name: "経理", position: "i", color: "cat-2" },
  { id: CAT_SAIYO, name: "採用", position: "l", color: "cat-5" },
  { id: CAT_SOMU, name: "総務", position: "o", color: "cat-3" },
];

export const MOCK_TASKS: Task[] = [
  // ── 営業（4 件・中くらいの高さ） ──
  {
    id: "task-eigyo-1",
    categoryId: CAT_EIGYO,
    title: "A社へ見積もり提出",
    description: "前年度実績ベースで再見積もり。\n値引き条件は要相談（粗利20%は死守）。",
    links: [{ title: "見積テンプレ", url: "https://example.com/quote" }],
    status: "todo",
    position: "a",
    dueDate: "2026-06-16",
    dueTime: "17:00",
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-10T09:00:00",
    updatedAt: "2026-06-10T09:00:00",
  },
  {
    id: "task-eigyo-2",
    categoryId: CAT_EIGYO,
    title: "月次の売上レポート確認",
    description: "",
    links: [],
    status: "doing",
    position: "b",
    dueDate: "2026-06-20",
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-11T10:00:00",
    updatedAt: "2026-06-12T14:00:00",
  },
  {
    id: "task-eigyo-3",
    categoryId: CAT_EIGYO,
    title: "B商事へ訪問アポ調整",
    description: "先方の都合は水・木の午前希望。",
    links: [],
    status: "todo",
    position: "c",
    dueDate: "2026-06-18",
    dueTime: "10:30",
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-13T08:30:00",
    updatedAt: "2026-06-13T08:30:00",
  },
  {
    id: "task-eigyo-4",
    categoryId: CAT_EIGYO,
    title: "新規リードを50件リストアップ",
    description: "",
    links: [],
    status: "todo",
    position: "d",
    dueDate: null,
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-14T11:00:00",
    updatedAt: "2026-06-14T11:00:00",
  },

  // ── 開発（6 件・最も高い列） ──
  {
    id: "task-dev-1",
    categoryId: CAT_DEV,
    title: "ログイン不具合の修正",
    description: "セッション切れ時に無限ループする件。再現手順あり。",
    links: [
      { title: "Issue #42", url: "https://example.com/issue/42" },
      { title: "再現動画", url: "https://example.com/repro" },
    ],
    status: "doing",
    position: "a",
    dueDate: "2026-06-17",
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-12T11:00:00",
    updatedAt: "2026-06-12T11:00:00",
  },
  {
    id: "task-dev-2",
    categoryId: CAT_DEV,
    title: "カレンダー無限スクロールのレビュー",
    description: "",
    links: [],
    status: "todo",
    position: "b",
    dueDate: null,
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-13T09:30:00",
    updatedAt: "2026-06-14T16:00:00",
  },
  {
    id: "task-dev-3",
    categoryId: CAT_DEV,
    title: "本番デプロイ手順書の更新",
    description: "dist ロック対策（Remove-Item）も追記する。",
    links: [],
    status: "todo",
    position: "c",
    dueDate: "2026-06-19",
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-13T10:00:00",
    updatedAt: "2026-06-13T10:00:00",
  },
  {
    id: "task-dev-4",
    categoryId: CAT_DEV,
    title: "依存パッケージのアップデート",
    description: "",
    links: [],
    status: "todo",
    position: "d",
    dueDate: null,
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-14T09:00:00",
    updatedAt: "2026-06-14T09:00:00",
  },
  {
    id: "task-dev-5",
    categoryId: CAT_DEV,
    title: "E2E テストの追加（主要導線）",
    description: "",
    links: [{ title: "テスト方針メモ", url: "https://example.com/e2e" }],
    status: "todo",
    position: "e",
    dueDate: "2026-06-24",
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-14T13:00:00",
    updatedAt: "2026-06-14T13:00:00",
  },
  {
    id: "task-dev-6",
    categoryId: CAT_DEV,
    title: "DnD のパフォーマンス計測",
    description: "数百件のタスクでカクつかないか確認。\nResizeObserver の再計算頻度も見る。",
    links: [],
    status: "doing",
    position: "f",
    dueDate: null,
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-14T15:30:00",
    updatedAt: "2026-06-14T15:30:00",
  },

  // ── 経理（2 件・短い列） ──
  {
    id: "task-keiri-1",
    categoryId: CAT_KEIRI,
    title: "請求書の発行（5月分）",
    description: "期限超過。至急対応。",
    links: [],
    status: "todo",
    position: "a",
    dueDate: "2026-06-10",
    dueTime: "12:00",
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-05T09:00:00",
    updatedAt: "2026-06-05T09:00:00",
  },
  {
    id: "task-keiri-2",
    categoryId: CAT_KEIRI,
    title: "経費精算のまとめ",
    description: "",
    links: [],
    status: "todo",
    position: "b",
    dueDate: "2026-06-30",
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-13T13:00:00",
    updatedAt: "2026-06-13T13:00:00",
  },

  // ── 採用（3 件） ──
  {
    id: "task-saiyo-1",
    categoryId: CAT_SAIYO,
    title: "面接日程の調整（3名）",
    description: "一次は来週前半で。会議室Aを仮押さえ。",
    links: [],
    status: "todo",
    position: "a",
    dueDate: "2026-06-18",
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-12T10:00:00",
    updatedAt: "2026-06-12T10:00:00",
  },
  {
    id: "task-saiyo-2",
    categoryId: CAT_SAIYO,
    title: "求人票の見直し",
    description: "",
    links: [{ title: "現行の求人票", url: "https://example.com/jd" }],
    status: "todo",
    position: "b",
    dueDate: null,
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-13T14:00:00",
    updatedAt: "2026-06-13T14:00:00",
  },
  {
    id: "task-saiyo-3",
    categoryId: CAT_SAIYO,
    title: "内定者へ連絡",
    description: "",
    links: [],
    status: "doing",
    position: "c",
    dueDate: "2026-06-16",
    dueTime: "15:00",
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-14T09:00:00",
    updatedAt: "2026-06-14T17:00:00",
  },

  // ── 総務（1 件・最も短い列） ──
  {
    id: "task-somu-1",
    categoryId: CAT_SOMU,
    title: "オフィス備品の発注",
    description: "プリンタのトナーが残りわずか。コピー用紙も。",
    links: [],
    status: "todo",
    position: "a",
    dueDate: null,
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-14T15:00:00",
    updatedAt: "2026-06-14T15:00:00",
  },

  // ── 未分類（2 件） ──
  {
    id: "task-uncat-1",
    categoryId: null,
    title: "健康診断の予約",
    description: "",
    links: [],
    status: "todo",
    position: "a",
    dueDate: "2026-06-24",
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-14T18:00:00",
    updatedAt: "2026-06-14T18:00:00",
  },
  {
    id: "task-uncat-2",
    categoryId: null,
    title: "年末調整の段取りを確認",
    description: "",
    links: [],
    status: "todo",
    position: "b",
    dueDate: null,
    dueTime: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-06-14T18:30:00",
    updatedAt: "2026-06-14T18:30:00",
  },

  // ── 完了済み（アーカイブ）— 完了履歴の目視用 ──
  {
    id: "task-done-1",
    categoryId: CAT_DEV,
    title: "本番ビルドの動作確認",
    description: "",
    links: [],
    status: "done",
    position: "z",
    dueDate: null,
    dueTime: null,
    completedAt: "2026-06-14T18:00:00",
    archivedAt: "2026-06-14T18:00:00",
    createdAt: "2026-06-09T09:00:00",
    updatedAt: "2026-06-14T18:00:00",
  },
  {
    id: "task-done-2",
    categoryId: CAT_EIGYO,
    title: "B社へ請求書送付",
    description: "",
    links: [],
    status: "done",
    position: "z",
    dueDate: null,
    dueTime: null,
    completedAt: "2026-06-13T11:30:00",
    archivedAt: "2026-06-13T11:30:00",
    createdAt: "2026-06-08T09:00:00",
    updatedAt: "2026-06-13T11:30:00",
  },
  {
    id: "task-done-3",
    categoryId: CAT_KEIRI,
    title: "口座残高の確認",
    description: "",
    links: [],
    status: "done",
    position: "z",
    dueDate: null,
    dueTime: null,
    completedAt: "2026-06-12T16:00:00",
    archivedAt: "2026-06-12T16:00:00",
    createdAt: "2026-06-07T09:00:00",
    updatedAt: "2026-06-12T16:00:00",
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
  // 金曜 6/19 — 夜の会食
  {
    id: "evt-7",
    title: "取引先と会食",
    startAt: "2026-06-19T18:30:00",
    endAt: "2026-06-19T20:30:00",
    allDay: false,
    location: "恵比寿",
    notes: "手土産を用意",
  },
  // 月曜 6/22 — 経営会議
  {
    id: "evt-8",
    title: "経営会議",
    startAt: "2026-06-22T10:00:00",
    endAt: "2026-06-22T12:00:00",
    allDay: false,
    location: "本社 大会議室",
    notes: null,
  },
  // 水曜 6/24 — 終日
  {
    id: "evt-9",
    title: "採用説明会",
    startAt: "2026-06-24T00:00:00",
    endAt: "2026-06-24T23:59:00",
    allDay: true,
    location: null,
    notes: null,
  },
  // 木〜金 6/25–6/26 — 複数日にまたぐ予定
  {
    id: "evt-10",
    title: "業界展示会に出展",
    startAt: "2026-06-25T00:00:00",
    endAt: "2026-06-26T23:59:00",
    allDay: true,
    location: "東京ビッグサイト",
    notes: "ブース設営は前日17時から",
  },
];

// 勤務地・シフト種別のマスタ（渋谷店 / 恵比寿店 / りんご / 休み）
const ST_SHIBUYA = "st-shibuya";
const ST_EBISU = "st-ebisu";
const ST_RINGO = "st-ringo";
const ST_OFF = "st-off";

export const MOCK_SHIFT_TYPES: ShiftType[] = [
  // 色はテーマパレットのスロット参照。「休み」は null＝自動（テーマ追従）の例。
  { id: ST_SHIBUYA, name: "渋谷店", color: "cat-1", position: "h" },
  { id: ST_EBISU, name: "恵比寿店", color: "cat-4", position: "n" },
  { id: ST_RINGO, name: "りんご", color: "cat-2", position: "t" },
  { id: ST_OFF, name: "休み", color: null, position: "x" },
];

// 表示範囲の勤務地割当（1日1件）
export const MOCK_SHIFTS: Shift[] = [
  { id: "shift-1", date: "2026-06-15", shiftTypeId: ST_SHIBUYA },
  { id: "shift-2", date: "2026-06-16", shiftTypeId: ST_EBISU },
  { id: "shift-3", date: "2026-06-17", shiftTypeId: ST_RINGO },
  { id: "shift-4", date: "2026-06-18", shiftTypeId: ST_OFF },
  { id: "shift-5", date: "2026-06-19", shiftTypeId: ST_SHIBUYA },
  { id: "shift-6", date: "2026-06-20", shiftTypeId: ST_OFF },
  { id: "shift-7", date: "2026-06-22", shiftTypeId: ST_EBISU },
  { id: "shift-8", date: "2026-06-23", shiftTypeId: ST_RINGO },
  { id: "shift-9", date: "2026-06-24", shiftTypeId: ST_SHIBUYA },
];
