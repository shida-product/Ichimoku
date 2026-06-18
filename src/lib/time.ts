/**
 * 時刻（HH:mm）ユーティリティ。
 * 予定の開始/終了、タスクの締切時刻など、15 分刻みのプルダウンで共通利用する。
 */

/** 時間ドロップダウンの刻み（分） */
export const STEP_MIN = 15;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 分（0〜1439）→ "HH:mm" */
export function minToHHMM(m: number): string {
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

/** "HH:mm" → 分（0〜1439） */
export function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/** 0:00〜23:45 を STEP_MIN 刻みで（value=HH:mm, label=H:mm） */
export const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let m = 0; m < 24 * 60; m += STEP_MIN) {
  TIME_OPTIONS.push({ value: minToHHMM(m), label: `${Math.floor(m / 60)}:${pad2(m % 60)}` });
}
