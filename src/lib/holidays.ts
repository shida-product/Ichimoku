/**
 * 日本の祝日判定（外部依存なし・自前計算）。
 *
 * 対応: 固定祝日／ハッピーマンデー／春分・秋分（1980–2099 で有効な近似式）／
 *       振替休日（2007 以降の運用：祝日が日曜なら次の非祝日を休日に）／
 *       国民の休日（祝日に挟まれた平日）。
 *
 * 注: 天皇誕生日は 2020 以降の 2/23 を採用（本アプリの対象期間＝2025 以降のため）。
 * カレンダーの曜日色（日・祝＝赤）に使う。年単位でメモ化する。
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function key(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** その年・月の第 n 月曜日の「日」を返す（ハッピーマンデー用）。 */
function nthMonday(year: number, month: number, nth: number): number {
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=日
  const offsetToMonday = (1 - firstDow + 7) % 7; // 1 日から最初の月曜までの差
  return 1 + offsetToMonday + (nth - 1) * 7;
}

/** 春分の日（3 月）。1980–2099 で有効な近似式。 */
function vernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/** 秋分の日（9 月）。1980–2099 で有効な近似式。 */
function autumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

const cache = new Map<number, Set<string>>();

/** その年の祝日（振替・国民の休日込み）の 'YYYY-MM-DD' 集合を返す。 */
function holidaySet(year: number): Set<string> {
  const cached = cache.get(year);
  if (cached) return cached;

  // 1) 基本となる「国民の祝日」
  const base = new Set<string>();
  const add = (m: number, d: number) => base.add(key(year, m, d));
  add(1, 1); // 元日
  base.add(key(year, 1, nthMonday(year, 1, 2))); // 成人の日
  add(2, 11); // 建国記念の日
  add(2, 23); // 天皇誕生日（2020 以降）
  base.add(key(year, 3, vernalEquinoxDay(year))); // 春分の日
  add(4, 29); // 昭和の日
  add(5, 3); // 憲法記念日
  add(5, 4); // みどりの日
  add(5, 5); // こどもの日
  base.add(key(year, 7, nthMonday(year, 7, 3))); // 海の日
  add(8, 11); // 山の日
  base.add(key(year, 9, nthMonday(year, 9, 3))); // 敬老の日
  base.add(key(year, 9, autumnalEquinoxDay(year))); // 秋分の日
  base.add(key(year, 10, nthMonday(year, 10, 2))); // スポーツの日
  add(11, 3); // 文化の日
  add(11, 23); // 勤労感謝の日

  const result = new Set(base);

  // 2) 国民の休日（祝日に挟まれた平日。日曜・祝日でない日）
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
    const k = key(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (base.has(k) || d.getDay() === 0) continue;
    const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const prevK = key(prev.getFullYear(), prev.getMonth() + 1, prev.getDate());
    const nextK = key(next.getFullYear(), next.getMonth() + 1, next.getDate());
    if (base.has(prevK) && base.has(nextK)) result.add(k);
  }

  // 3) 振替休日（祝日が日曜なら、次の非祝日を休日に）
  for (const k of [...result].sort()) {
    const [y, m, d] = k.split("-").map(Number);
    if (new Date(y, m - 1, d).getDay() !== 0) continue; // 日曜の祝日のみ
    const nx = new Date(y, m - 1, d);
    do {
      nx.setDate(nx.getDate() + 1);
    } while (result.has(key(nx.getFullYear(), nx.getMonth() + 1, nx.getDate())));
    result.add(key(nx.getFullYear(), nx.getMonth() + 1, nx.getDate()));
  }

  cache.set(year, result);
  return result;
}

/** 指定日が日本の祝日（振替・国民の休日含む）かどうか。 */
export function isHoliday(date: Date): boolean {
  return holidaySet(date.getFullYear()).has(
    key(date.getFullYear(), date.getMonth() + 1, date.getDate())
  );
}
