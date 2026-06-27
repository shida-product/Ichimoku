/**
 * 日本語の自然言語から締切（日付・時刻）を抽出する軽量ヒューリスティック。
 *
 * 位置づけ:
 * - プレビュー/開発時はこの内蔵パーサで即時に動く（無料・キー不要・オフライン）。
 * - 本番では Supabase Edge Function 経由の Gemini 解析に差し替える想定（精度向上）。
 *   差し替え先は `src/lib/nlp/parseTask.ts` の `parseTaskInput` 1 箇所のみ。
 *
 * 対応表現の例:
 *   今日 / 明日 / 明後日 / しあさって / 来週 / 再来週 / 来月
 *   月曜〜日曜（来週・今週の接頭辞可） / 6月25日 / 6/25 / 25日（〜まで）
 *   15時 / 15時30分 / 15時半 / 15:30 / 午前9時 / 午後3時
 */

import { APP_TODAY, parseDate } from "@/lib/date";

export interface DateTimeMatch {
  dueDate: string | null; // 'YYYY-MM-DD'
  dueTime: string | null; // 'HH:mm'
  /** 元文字列のうち日付/時刻として消費した範囲（タイトルから除去するため）。 */
  ranges: [number, number][];
}

/** 全角数字・全角コロンを半角へ（文字数を変えない＝インデックス保持）。 */
function normalize(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ":");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/** base 年で month(1-12)/day の Date を作る。過ぎていれば翌年に送る。 */
function dateInYear(base: Date, month1: number, day: number): Date {
  let d = new Date(base.getFullYear(), month1 - 1, day);
  if (d.getTime() < base.getTime()) d = new Date(base.getFullYear() + 1, month1 - 1, day);
  return d;
}

/** 「N日」: 当月の day。今日より前なら翌月。 */
function dayOfMonth(base: Date, day: number): Date {
  let d = new Date(base.getFullYear(), base.getMonth(), day);
  if (d.getTime() < base.getTime()) d = new Date(base.getFullYear(), base.getMonth() + 1, day);
  return d;
}

const WEEKDAY: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };

/**
 * 曜日の日付を求める。
 * - weekRelative=false（接頭辞なし/今週）: 今日より後の直近の target 曜日。
 * - weekRelative=true（来週/再来週）: 月曜起点の週で weeksAhead 週後の target 曜日。
 */
function weekdayDate(base: Date, target: number, weeksAhead: number, weekRelative: boolean): Date {
  if (!weekRelative) {
    let delta = (target - base.getDay() + 7) % 7;
    if (delta === 0) delta = 7; // 同じ曜日は「次回（来週同曜）」とみなす
    return addDays(base, delta);
  }
  const sinceMonday = (base.getDay() + 6) % 7; // 月=0 … 日=6
  const monday = addDays(base, -sinceMonday);
  const dowFromMonday = (target + 6) % 7; // target を月曜起点に変換
  return addDays(monday, 7 * weeksAhead + dowFromMonday);
}

/** 時刻抽出（最初の 1 件）。 */
function matchTime(s: string): { time: string; range: [number, number] } | null {
  const re =
    /(午前|午後|朝|夜|晩|夕方|夕)?\s*(\d{1,2})\s*(?::(\d{2})|時\s*(?:(\d{1,2})\s*分|(半))?)(?:\s*(?:まで|までに))?/;
  const m = re.exec(s);
  if (!m) return null;
  const ampm = m[1];
  let h = Number(m[2]);
  let min = 0;
  if (m[3] != null)
    min = Number(m[3]); // HH:MM
  else if (m[4] != null)
    min = Number(m[4]); // N時M分
  else if (m[5] != null) min = 30; // N時半

  if (ampm === "午後" || ampm === "夜" || ampm === "晩" || ampm === "夕方" || ampm === "夕") {
    if (h < 12) h += 12;
  } else if (ampm === "午前" || ampm === "朝") {
    if (h === 12) h = 0;
  }
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  // 「:MM」「時」のいずれの形でもない裸の数字は時刻として扱わない（誤爆防止）。
  if (m[3] == null && !/時/.test(m[0])) return null;
  return { time: `${pad2(h)}:${pad2(min)}`, range: [m.index, m.index + m[0].length] };
}

/** 日付抽出（最初の 1 件）。 */
function matchDate(s: string, base: Date): { date: string; range: [number, number] } | null {
  const suffix = "(?:まで|までに)?";

  // 1) 相対語（日単位・長い語を先に）
  const rel: [RegExp, number][] = [
    [new RegExp(`(本日|今日|きょう)${suffix}`), 0],
    [new RegExp(`(明後日|あさって)${suffix}`), 2],
    [new RegExp(`(明々後日|明明後日|しあさって)${suffix}`), 3],
    [new RegExp(`(明日|あした|あす)${suffix}`), 1],
  ];
  for (const [re, days] of rel) {
    const m = re.exec(s);
    if (m) return { date: ymd(addDays(base, days)), range: [m.index, m.index + m[0].length] };
  }

  // 2) 来月D日 / 来月
  let m = new RegExp(`来月\\s*(\\d{1,2})\\s*日${suffix}`).exec(s);
  if (m) {
    const d = new Date(base.getFullYear(), base.getMonth() + 1, Number(m[1]));
    return { date: ymd(d), range: [m.index, m.index + m[0].length] };
  }
  m = new RegExp(`来月${suffix}`).exec(s);
  if (m) {
    const d = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
    return { date: ymd(d), range: [m.index, m.index + m[0].length] };
  }

  // 3) M月D日
  m = new RegExp(`(\\d{1,2})\\s*月\\s*(\\d{1,2})\\s*日${suffix}`).exec(s);
  if (m) {
    const d = dateInYear(base, Number(m[1]), Number(m[2]));
    return { date: ymd(d), range: [m.index, m.index + m[0].length] };
  }

  // 4) 曜日（今週/来週/再来週の接頭辞可）。bare の「来週/再来週」より先に判定し、
  //    「来週月曜」全体を 1 つの曜日指定として消費する。
  m = new RegExp(`(今週|来週|再来週|次の|今度の)?\\s*([月火水木金土日])\\s*曜日?${suffix}`).exec(s);
  if (m) {
    const target = WEEKDAY[m[2]];
    const weekRelative = m[1] === "来週" || m[1] === "再来週";
    const weeksAhead = m[1] === "再来週" ? 2 : 1;
    const d = weekdayDate(base, target, weeksAhead, weekRelative);
    return { date: ymd(d), range: [m.index, m.index + m[0].length] };
  }

  // 5) 来週 / 再来週（曜日を伴わない単独指定）
  m = new RegExp(`(再来週)${suffix}`).exec(s);
  if (m) return { date: ymd(addDays(base, 14)), range: [m.index, m.index + m[0].length] };
  m = new RegExp(`(来週)${suffix}`).exec(s);
  if (m) return { date: ymd(addDays(base, 7)), range: [m.index, m.index + m[0].length] };

  // 6) M/D
  m = new RegExp(`(\\d{1,2})\\s*/\\s*(\\d{1,2})${suffix}`).exec(s);
  if (m) {
    const d = dateInYear(base, Number(m[1]), Number(m[2]));
    return { date: ymd(d), range: [m.index, m.index + m[0].length] };
  }

  // 7) N日（最も汎用なので最後）
  m = new RegExp(`(\\d{1,2})\\s*日${suffix}`).exec(s);
  if (m) {
    const d = dayOfMonth(base, Number(m[1]));
    return { date: ymd(d), range: [m.index, m.index + m[0].length] };
  }

  return null;
}

/**
 * 文字列から締切（日付・時刻）を抽出する。
 * @param text 入力文字列
 * @param today 基準日 'YYYY-MM-DD'（省略時は APP_TODAY）
 */
export function parseJaDateTime(text: string, today: string = APP_TODAY): DateTimeMatch {
  const s = normalize(text);
  const base = parseDate(today);
  const ranges: [number, number][] = [];

  const t = matchTime(s);
  let dueTime: string | null = null;
  if (t) {
    dueTime = t.time;
    ranges.push(t.range);
  }

  const d = matchDate(s, base);
  let dueDate: string | null = null;
  if (d) {
    dueDate = d.date;
    ranges.push(d.range);
  }

  // 時刻だけ指定で日付が無い場合は「今日」を補う（例: 「連絡 15時まで」）。
  if (dueTime && !dueDate) dueDate = ymd(base);

  return { dueDate, dueTime, ranges };
}

/** 日付/時刻として消費した範囲を元文字列から取り除き、整形したタイトルを返す。 */
export function stripRanges(s: string, ranges: [number, number][]): string {
  if (!ranges.length) return s.trim();
  const sorted = [...ranges].sort((a, b) => b[0] - a[0]);
  let out = s;
  for (const [a, b] of sorted) out = out.slice(0, a) + " " + out.slice(b);
  return out
    .replace(/[\u3000\s]+/g, " ")
    .replace(/\s*(まで|までに)\s*$/, "")
    .replace(/^[、,。・\s]+|[、,。・\s]+$/g, "")
    .trim();
}
