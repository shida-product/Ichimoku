/**
 * 分類色（カテゴリ・勤務地）の単一管理ポイント。
 *
 * モデル: 「色そのもの」は保存しない。データは **テーマパレットのスロット参照**
 * （"cat-1".."cat-6"）か null（自動）だけを持つ。実際の色値は index.css の
 * `--cat-1 .. --cat-N` ＋ `--cat-uncat` に一元化し、ColorTuner のプリセットで一括切替できる。
 * これにより「テーマを変えれば全分類色が追従」「コントラスト破綻なし」を担保する。
 *
 * - 自前のスロット（"cat-3"）を持つ → そのスロット色（テーマ追従）
 * - null → index 順に自動割当（テーマ追従）
 * - 旧データの自由 hex（"#aabbcc"）→ 後方互換でそのまま表示（テーマ非追従）
 */

/** index.css に定義する分類色の数（--cat-1 .. --cat-N） */
export const CAT_PALETTE_SIZE = 6;

/** 未分類など中立要素のフォールバック色（テーマ追従） */
export const CAT_UNCAT_VAR = "var(--cat-uncat)";

/** 選択肢になるスロットキー一覧（"cat-1".."cat-6"）。ピッカーが参照する。 */
export const CAT_SLOTS = Array.from({ length: CAT_PALETTE_SIZE }, (_, i) => `cat-${i + 1}`);

/** index（0 始まり）→ スロットの CSS 変数参照（自動割当用）。 */
export function paletteVar(index: number): string {
  return `var(--cat-${(index % CAT_PALETTE_SIZE) + 1})`;
}

/** スロットキー（"cat-3"）→ CSS 変数参照。スウォッチ描画用。 */
export function slotVar(slot: string): string {
  return `var(--${slot})`;
}

/**
 * 保存値（スロット / 自由hex / null）と index から、表示用の CSS color を解決する。
 * カテゴリ・勤務地で共通。
 */
export function resolveColor(stored: string | null, index: number): string {
  if (!stored) return paletteVar(index); // null＝自動（index 順）
  if (stored.startsWith("#")) return stored; // 旧データの自由 hex（後方互換）
  return slotVar(stored); // "cat-3" → var(--cat-3)
}

/**
 * hex でも var() でも受け取り、α付きの淡色（背景塗り）にする。
 * 旧来の `${color}2e` 連結は var() と非互換なため color-mix に統一。
 * percent はおおよそ旧 16 進α相当: 2e≒18 / 66≒40 / 1f≒12。
 */
export function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
