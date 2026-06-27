/**
 * 空き日（予定が入っていない日）の算出。
 *
 * 用途: 「6月は26日・28日が空いています」のように、アポ調整に使える空き日を出す。
 * 判定対象は **予定（EventItem）のみ**。タスクの締切は予定枠を埋めないので除外する。
 *
 * プレビューはモックの events から算出。本番では Google Calendar の予定
 * （freeBusy / events）に差し替えるだけで同じ表示ロジックが使える。
 */

import { APP_TODAY, parseDate } from "@/lib/date";
import type { EventItem } from "@/lib/types";

export interface MonthFreeDays {
  year: number;
  month0: number; // 0-11
  /** 今日以降の空き日（'YYYY-MM-DD' 昇順）。 */
  freeDates: string[];
  /** その月に予定が入っている日数。 */
  busyCount: number;
}

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 予定が占有する日（ローカル日付）を集合化する。複数日予定は各日を埋める。 */
function busyDatesInMonth(events: EventItem[], year: number, month0: number): Set<string> {
  const busy = new Set<string>();
  for (const e of events) {
    const startKey = e.startAt.slice(0, 10);
    const endKey = (e.endAt || e.startAt).slice(0, 10);
    let cur = parseDate(startKey);
    const end = parseDate(endKey);
    if (end.getTime() < cur.getTime()) continue; // 異常データはスキップ
    // 安全のため最大 366 日でループを打ち切る。
    for (let i = 0; i <= 366 && cur.getTime() <= end.getTime(); i++) {
      if (cur.getFullYear() === year && cur.getMonth() === month0) busy.add(ymd(cur));
      const next = new Date(cur);
      next.setDate(next.getDate() + 1);
      cur = next;
    }
  }
  return busy;
}

/**
 * 指定月の空き日（今日以降）を算出する。
 * @param events 予定一覧
 * @param year 西暦
 * @param month0 月（0-11）
 * @param today 基準日（省略時 APP_TODAY）。これより前の日は候補にしない。
 */
export function computeMonthFreeDays(
  events: EventItem[],
  year: number,
  month0: number,
  today: string = APP_TODAY
): MonthFreeDays {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const busy = busyDatesInMonth(events, year, month0);
  const todayTime = parseDate(today).getTime();

  const freeDates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month0, day);
    if (d.getTime() < todayTime) continue; // 過去日は候補外
    const key = ymd(d);
    if (!busy.has(key)) freeDates.push(key);
  }
  return { year, month0, freeDates, busyCount: busy.size };
}
