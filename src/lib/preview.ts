/**
 * プレビュー（目視チェック）モード判定。
 *
 * DEV ビルドかつ「Supabase 未設定」または `VITE_PREVIEW_MOCK=true` のとき true。
 * このとき AppDataContext はメモリ内モックを表示し、ミューテーションは Supabase を
 * 呼ばずキャッシュ上だけで完結する（ログイン不要で全機能を触れる）。
 * 本番ビルド（DEV=false）では常に false。
 */
export const IS_PREVIEW =
  import.meta.env.DEV &&
  (import.meta.env.VITE_PREVIEW_MOCK === "true" || !import.meta.env.VITE_SUPABASE_URL);
