import type { ShiftType } from "@/lib/types";
import { paletteVar } from "@/lib/palette";

/**
 * シフト種別の表示色を解決する。color 未設定時は分類色（テーマ追従）にフォールバック。
 * 実値・解決ロジックの正本は src/lib/palette.ts（index.css の --cat-* を 1 箇所で管理）。
 */
export function shiftColor(s: ShiftType, index: number): string {
  return s.color ?? paletteVar(index);
}
