import type { EventItem } from "@/lib/types";

/**
 * カレンダー時間グリッド用のユーティリティ（純粋関数）。
 *
 * 時刻はすべて「ローカル時刻」で扱う。イベントの startAt/endAt は
 * naive ローカル ISO 文字列（"YYYY-MM-DDTHH:mm:ss"）を想定し、
 * 書き戻しも同形式に揃える（既存の addEvent / EventDetailPanel と一致）。
 * ※ Supabase の timestamptz は tz 付きで返るため、厳密な TZ 対応は別途必要（handover 参照）。
 */

/** スナップ単位（分）。ドラッグ・リサイズはこの粒度に丸める。 */
export const SNAP_MIN = 15;

const WD = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date → 'YYYY-MM-DD'（ローカル） */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 曜日ラベル（日本語1文字） */
export function weekdayLabel(d: Date): string {
  return WD[d.getDay()];
}

/** ISO 文字列 → Date（naive ローカルとして解釈） */
export function parseIso(iso: string): Date {
  return new Date(iso);
}

/** Date → naive ローカル ISO 文字列 "YYYY-MM-DDTHH:mm:ss" */
export function toLocalIso(d: Date): string {
  return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** その日の 0:00 からの経過分（0〜1439） */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** 当日 0:00 の Date */
export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** n 日後（負で前）の Date */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

/** 週の開始（日曜 0:00） */
export function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

/** 週（日曜〜土曜）の 7 日分 */
export function weekDays(anchor: Date): Date[] {
  const s = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

/** step 分単位に丸める */
export function snap(min: number, step = SNAP_MIN): number {
  return Math.round(min / step) * step;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** 指定日の 0:00 から minutes 分後の Date */
export function dateAtMinutes(day: Date, minutes: number): Date {
  const r = startOfDay(day);
  r.setMinutes(minutes);
  return r;
}

/** 'M/D'（ローカル） */
export function formatMonthDay(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 'H:mm'（24h・ローカル） */
export function formatTime(d: Date): string {
  return `${d.getHours()}:${pad(d.getMinutes())}`;
}

/** グリッド上に配置済みのイベント（重なりは列に振り分け済み） */
export interface PositionedEvent {
  event: EventItem;
  startMin: number;
  endMin: number;
  /** 重なりグループ内の列インデックス（0 始まり） */
  col: number;
  /** 重なりグループの列数 */
  cols: number;
}

interface DayItem {
  event: EventItem;
  startMin: number;
  endMin: number;
}

/**
 * 1 日分のイベントを、重なりを考慮して列（col/cols）に振り分ける。
 * 区間グラフの貪欲彩色: 開始順に走査し、空いた最初の列へ置く。
 * 互いに重ならないイベントが続く間を 1 クラスタとし、クラスタ単位で列数を決める。
 */
export function layoutDay(items: DayItem[]): PositionedEvent[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const result: PositionedEvent[] = [];
  let cluster: DayItem[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = []; // 各列の現在の終了分
    const placed = cluster.map((item) => {
      let c = colEnds.findIndex((end) => end <= item.startMin);
      if (c === -1) {
        c = colEnds.length;
        colEnds.push(item.endMin);
      } else {
        colEnds[c] = item.endMin;
      }
      return { item, col: c };
    });
    const cols = colEnds.length;
    for (const { item, col } of placed) {
      result.push({ event: item.event, startMin: item.startMin, endMin: item.endMin, col, cols });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();
  return result;
}
