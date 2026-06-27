/**
 * 時間軸レンズ（別軸タブ）。
 *
 * 設計（ADR-0002「整理を生まない」と整合）:
 * - カテゴリ（何の仕事か）と時間軸（いつやるか）は独立した軸。
 * - 時間軸はタスクの締切（dueDate）から **自動分類** し、手動の振り分けを生まない。
 * - タブはボードに対する「絞り込みレンズ」。カテゴリ列の構成は変えない。
 * - 締切なしは「いつか」バケツに集約する。
 *
 * 各タブは累積（しきい値以下）で判定する:
 *   今日 = 締切が今日まで（期限切れ含む） / 今月 = 今月末まで /
 *   半年 = 約半年（183日）以内 / いつか = 締切なし / すべて = 全件
 */

import { APP_TODAY, daysUntil, parseDate } from "@/lib/date";

export type Horizon = "all" | "today" | "month" | "half" | "someday";

export const HORIZONS: { key: Horizon; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "today", label: "今日" },
  { key: "month", label: "今月" },
  { key: "half", label: "半年" },
  { key: "someday", label: "いつか" },
];

const HALF_YEAR_DAYS = 183;

/** 'YYYY-MM-DD' の月末日（同フォーマット）を返す。 */
function endOfMonth(today: string): string {
  const d = parseDate(today);
  const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const m = String(e.getMonth() + 1).padStart(2, "0");
  const day = String(e.getDate()).padStart(2, "0");
  return `${e.getFullYear()}-${m}-${day}`;
}

/** タスクの締切が、指定タブの時間軸に含まれるか。 */
export function inHorizon(dueDate: string | null, h: Horizon, today: string = APP_TODAY): boolean {
  if (h === "all") return true;
  if (h === "someday") return dueDate == null;
  if (dueDate == null) return false; // 日付タブには締切なしを含めない
  if (h === "today") return daysUntil(dueDate, today) <= 0; // 今日まで＋期限切れ
  if (h === "month") return dueDate <= endOfMonth(today); // 文字列比較で月末まで（期限切れ含む）
  if (h === "half") return daysUntil(dueDate, today) <= HALF_YEAR_DAYS;
  return true;
}
