import type { DueUrgency } from "@/lib/types";

/**
 * 日付ユーティリティ（締切は日付のみ 'YYYY-MM-DD'）。
 * モックの基準日。Supabase 配線時は実日付に置き換える。
 */
export const APP_TODAY = "2026-06-15";

/** 'YYYY-MM-DD' をローカル 0 時の Date に変換 */
export function parseDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00`);
}

/** today から due までの残り日数（負＝期限切れ） */
export function daysUntil(due: string, today: string = APP_TODAY): number {
  const ms = parseDate(due).getTime() - parseDate(today).getTime();
  return Math.round(ms / 86_400_000);
}

/** 締切の緊急度: 3日以内＝crit / 7日以内＝warn / それ以遠＝calm */
export function dueUrgency(due: string, today: string = APP_TODAY): DueUrgency {
  const d = daysUntil(due, today);
  if (d <= 3) return "crit";
  if (d <= 7) return "warn";
  return "calm";
}

/** 'M/D' 表記 */
export function formatMd(ymd: string): string {
  const d = parseDate(ymd);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 締切表記。時刻があれば 'M/D HH:mm'、なければ 'M/D'。 */
export function formatDue(ymd: string, time: string | null): string {
  return time ? `${formatMd(ymd)} ${time}` : formatMd(ymd);
}

/** 残り日数の人間向けラベル */
export function daysLabel(due: string, today: string = APP_TODAY): string {
  const d = daysUntil(due, today);
  if (d < 0) return "期限切れ";
  if (d === 0) return "今日";
  return `あと ${d}日`;
}

/** 緊急度→Tailwind ユーティリティ（文字色 / 地色 / 枠色 / 左バー色）を返す */
export function urgencyClasses(u: DueUrgency): {
  text: string;
  bg: string;
  border: string;
  bar: string;
} {
  switch (u) {
    case "crit":
      return {
        text: "text-crit",
        bg: "bg-crit-soft",
        border: "border-crit/30",
        bar: "border-l-crit border-l-[3px]",
      };
    case "warn":
      return {
        text: "text-warn",
        bg: "bg-warn-soft",
        border: "border-warn/30",
        bar: "border-l-warn border-l-[3px]",
      };
    default:
      return {
        text: "text-muted-foreground",
        bg: "bg-secondary",
        border: "border-border",
        bar: "border-l-transparent border-l-[3px]",
      };
  }
}
