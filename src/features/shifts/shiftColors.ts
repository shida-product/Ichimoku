import type { ShiftType } from "@/lib/types";

/** シフト種別の標準色（color 未設定時のフォールバック） */
export const SHIFT_FALLBACK = ["#c2603f", "#4f7a6f", "#8a6d3b", "#7a5c8e", "#6b7c93", "#9aa29f"];

/** index をフォールバックに使ってシフト色を解決する。 */
export function shiftColor(s: ShiftType, index: number): string {
  return s.color ?? SHIFT_FALLBACK[index % SHIFT_FALLBACK.length];
}
