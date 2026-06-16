import { useAuth } from "@/features/auth/AuthContext";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { AppShell } from "@/components/layout/AppShell";
import { IS_PREVIEW as PREVIEW_MODE } from "@/lib/preview";
import { Loader2 } from "lucide-react";

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
