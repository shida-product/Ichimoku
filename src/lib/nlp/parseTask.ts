/**
 * 自然言語のタスク入力を解析し、{タイトル, カテゴリ, 締切日, 締切時刻} に分解する。
 *
 * 設計方針（差し替え可能なコネクタ）:
 * - この `parseTaskInput` がアプリ全体の入口（単一の契約）。
 * - 現在は無料・即時の内蔵ヒューリスティック。インライン解析プレビューに使う。
 * - 本番は「入力中はこの即時解析でプレビュー」「確定時に Edge Function 経由の
 *   Gemini で再解析して精度を上げる」ハイブリッドを想定。Gemini を足すときも
 *   呼び出し側（Board の submit）から本関数の戻り値型 `ParsedTask` を保つだけでよい。
 */

import type { Category } from "@/lib/types";
import { parseJaDateTime, stripRanges } from "./jaDateTime";

export interface ParsedTask {
  /** 締切表現を取り除いたタイトル（消化に使う実体）。 */
  title: string;
  /** 入力された生の文字列（監査・フォールバック用）。 */
  rawTitle: string;
  categoryId: string | null;
  categoryName: string | null;
  dueDate: string | null; // 'YYYY-MM-DD'
  dueTime: string | null; // 'HH:mm'
}

/**
 * カテゴリ名から連想する語（ヒューリスティックの底上げ）。
 * キーはカテゴリ「名」。ユーザー定義カテゴリでも、名前一致は別途効くため、
 * ここは標準的な部門名にだけ効けばよい（本番 Gemini は文脈で判定）。
 */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  経理: [
    "振込",
    "振り込み",
    "請求",
    "支払",
    "支払い",
    "入金",
    "精算",
    "経費",
    "領収",
    "決済",
    "給与",
    "税",
    "見積",
    "請求書",
  ],
  営業: [
    "連絡",
    "商談",
    "提案",
    "訪問",
    "アポ",
    "顧客",
    "客先",
    "契約",
    "架電",
    "フォロー",
    "問い合わせ",
    "見込み",
  ],
  開発: [
    "実装",
    "バグ",
    "修正",
    "リリース",
    "設計",
    "レビュー",
    "デプロイ",
    "テスト",
    "改修",
    "リファクタ",
    "API",
    "不具合",
  ],
  採用: [
    "面接",
    "応募",
    "求人",
    "採用",
    "面談",
    "オファー",
    "内定",
    "スカウト",
    "エントリー",
    "選考",
  ],
  総務: [
    "備品",
    "契約書",
    "書類",
    "総務",
    "発注",
    "郵送",
    "庶務",
    "手続き",
    "申請",
    "社内",
    "稟議",
  ],
};

/** 入力テキストに最もよく合うカテゴリを返す（無ければ null）。 */
function matchCategory(text: string, categories: Category[]): Category | null {
  if (!text) return null;
  const hay = text.toLowerCase();

  // 1) カテゴリ名そのものが含まれていれば最優先（ユーザー定義名にも効く）。
  for (const c of categories) {
    const name = c.name.trim();
    if (name && hay.includes(name.toLowerCase())) return c;
  }

  // 2) 名前に対応する連想語が含まれていれば採用。
  for (const c of categories) {
    const syns = CATEGORY_SYNONYMS[c.name.trim()];
    if (syns && syns.some((w) => hay.includes(w.toLowerCase()))) return c;
  }

  return null;
}

/**
 * 自然言語のタスク入力を解析する。
 * @param text 入力文字列（例: 「〇〇への振込 25日まで」）
 * @param categories 現在のカテゴリ一覧（自動判定の候補）
 * @param today 基準日 'YYYY-MM-DD'（省略時は APP_TODAY）
 */
export function parseTaskInput(text: string, categories: Category[], today?: string): ParsedTask {
  const raw = text.trim();
  const dt = parseJaDateTime(raw, today);
  const stripped = stripRanges(raw, dt.ranges);
  const title = stripped || raw; // 締切語しか無い等で空になる場合は生入力を残す

  // カテゴリ判定はタイトル本体（締切語除去後）と生入力の両方を見て取りこぼしを減らす。
  const cat = matchCategory(title, categories) ?? matchCategory(raw, categories);

  return {
    title,
    rawTitle: raw,
    categoryId: cat?.id ?? null,
    categoryName: cat?.name ?? null,
    dueDate: dt.dueDate,
    dueTime: dt.dueTime,
  };
}
