/**
 * 並び順キー（fractional index）の生成ユーティリティ。
 *
 * DB の `position`（text, not null）は「字句順（lexicographic）で比較したときの並び」を表す。
 * 2 つの隣接キーの「あいだ」に入る新しいキーを返すことで、両端のキーを書き換えずに
 * 1 件だけ更新すれば並べ替えが完結する（fractional indexing）。
 *
 * - 文字は 'a'〜'z'（charCode 97〜122）のみを使う。
 * - 下端の番兵は 'a'-1 = 96、上端の番兵は 'z'+1 = 123。
 * - `keyBetween(null, null)` のように両端が無い場合は中央付近のキーを返す。
 */

const LOW = 96; // 'a' - 1（先頭より前）
const HIGH = 123; // 'z' + 1（末尾より後）

/**
 * a < result < b を満たすキーを返す（字句順）。
 * a が null なら「先頭より前」、b が null なら「末尾より後」を意味する。
 */
export function keyBetween(a: string | null, b: string | null): string {
  // 入力が不正（a >= b）な場合でも壊れないよう、最低限のガードを置く。
  if (a !== null && b !== null && a >= b) {
    // 想定外。安全側に倒して a の直後を返す。
    return keyAfter(a);
  }

  let result = "";
  let i = 0;
  for (;;) {
    const lo = i < (a?.length ?? 0) ? a!.charCodeAt(i) : LOW;
    const hi = i < (b?.length ?? 0) ? b!.charCodeAt(i) : HIGH;

    if (lo === hi) {
      result += String.fromCharCode(lo);
      i += 1;
      continue;
    }

    const mid = Math.floor((lo + hi) / 2);
    if (mid === lo) {
      // 隣接していて間が無い → 1 桁伸ばして次の桁で中点を取る。
      result += String.fromCharCode(lo);
      i += 1;
      continue;
    }
    result += String.fromCharCode(mid);
    return result;
  }
}

/** a の直後（a < result）に入るキー。リスト末尾への追加に使う。 */
export function keyAfter(a: string | null): string {
  return keyBetween(a, null);
}

/** b の直前（result < b）に入るキー。リスト先頭への追加に使う。 */
export function keyBefore(b: string | null): string {
  return keyBetween(null, b);
}
