import { useAuth } from "@/features/auth/AuthContext";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { AppShell } from "@/components/layout/AppShell";
import { Loader2 } from "lucide-react";

/**
 * プレビューモード（DEV 専用）。
 * 開発中に Supabase 未設定 or `VITE_PREVIEW_MOCK=true` のとき、ログインを介さず
 * モックデータでシェルを表示し、目視チェックできるようにする。本番ビルドでは無効。
 */
const PREVIEW_MODE =
  import.meta.env.DEV &&
  (import.meta.env.VITE_PREVIEW_MOCK === "true" || !import.meta.env.VITE_SUPABASE_URL);

function App() {
  const { user, loading } = useAuth();

  if (loading && !PREVIEW_MODE) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <Loader2 className="size-7 animate-spin text-primary" />
        <p className="text-sm font-medium tracking-wider">読み込み中…</p>
      </div>
    );
  }

  if (!user && !PREVIEW_MODE) {
    return <AuthScreen />;
  }

  return <AppShell />;
}

export default App;
