/**
 * 分類色（カテゴリ・勤務地のフォールバック）の単一管理ポイント。
 *
 * 色の「実値」は index.css の `--cat-1 .. --cat-N` ＋ `--cat-uncat` に置く
 * （テーマ＝ColorTuner のプリセットで一括切替できる＝配色は 1 箇所で管理）。
 * このモジュールは「index → CSS 変数参照」「α付き淡色（color-mix）」
 * 「<input type=color> 用の実 hex 解決」だけを担い、色値そのものは持たない。
 *
 * 各カテゴリ/勤務地が自前の色（data の color）を持つ場合はそれが最優先。
 * color 未設定のときだけ、この index 順のテーマ色にフォールバックする。
 */

/** index.css に定義する分類色の数（--cat-1 .. --cat-N） */
export const CAT_PALETTE_SIZE = 6;

/** 未分類など中立要素のフォールバック色（テーマ追従） */
export const CAT_UNCAT_VAR = "var(--cat-uncat)";

/** 標準色サンプル表示用の var() 一覧（管理パネルの「標準色」など） */
export const CAT_PALETTE_VARS = Array.from(
  { length: CAT_PALETTE_SIZE },
  (_, i) => `var(--cat-${i + 1})`
);

/** index（0 始まり）→ CSS 変数参照。dot やタイント素色として使う。 */
export function paletteVar(index: number): string {
  return `var(--cat-${(index % CAT_PALETTE_SIZE) + 1})`;
}

/**
 * hex でも var() でも受け取り、α付きの淡色（背景塗り）にする。
 * 旧来の `${color}2e` 連結は var() と非互換なため color-mix に統一。
 * percent はおおよそ旧 16 進α相当: 2e≒18 / 66≒40 / 1f≒12。
 */
export function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

/**
 * <input type="color"> の value 用に実 hex へ解決する。
 * var(--x) のときは :root の computed value を読む（DOM 前提のクライアント専用）。
 */
export function toHex(color: string): string {
  if (!color.startsWith("var(")) return color;
  const name = color.slice(4, -1).trim(); // "var(--cat-1)" → "--cat-1"
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#888888";
}
