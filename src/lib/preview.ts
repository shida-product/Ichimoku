/**
 * プレビュー（目視チェック）モード判定。
 *
 * `VITE_PREVIEW_MOCK=true` または Supabase 未設定のとき true。
 * このとき AppDataContext はメモリ内モックを表示し、ミューテーションは Supabase を
 * 呼ばずキャッシュ上だけで完結する（ログイン不要で全機能を触れる）。
 * 実 DB に切り替えるには `.env.local` に VITE_SUPABASE_URL を設定する。
 */
export const IS_PREVIEW =
  import.meta.env.VITE_PREVIEW_MOCK === "true" || !import.meta.env.VITE_SUPABASE_URL;
