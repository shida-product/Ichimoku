import { useAuth } from "@/features/auth/AuthContext";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { AppShell } from "@/components/layout/AppShell";
import { Loader2 } from "lucide-react";

function App() {
  const { user, loading } = useAuth();

  // ローディング画面
  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <Loader2 className="size-7 animate-spin text-primary" />
        <p className="text-sm font-medium tracking-wider">読み込み中…</p>
      </div>
    );
  }

  // 未ログイン時は認証画面
  if (!user) {
    return <AuthScreen />;
  }

  // ログイン時は 1画面・遷移ゼロのメインシェル
  return <AppShell />;
}

export default App;
