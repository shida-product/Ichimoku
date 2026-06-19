import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase environment variables. Please check your .env file.");
}

// 他アプリと同居する共有プロジェクト上で、Ichimoku は専用スキーマ `ichimoku` だけを触る。
// 既定スキーマを ichimoku にすることで supabase.from("tasks") 等が ichimoku.tasks を指す
// （public の他アプリ用テーブルには一切アクセスしない）。
// 生成型は未導入のため Database = any。SchemaName だけ "ichimoku" に上書きする。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any, "ichimoku">(
  supabaseUrl || "https://placeholder-project.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    db: { schema: "ichimoku" },
  }
);
