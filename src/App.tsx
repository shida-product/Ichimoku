import { useAuth } from "@/features/auth/AuthContext";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { Loader2, LogOut, Layout, Calendar, Clock, CheckCircle2 } from "lucide-react";

function App() {
  const { user, loading, signOut } = useAuth();

  // ローディング画面
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-slate-300 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm font-medium tracking-wider text-slate-400">ロード中...</p>
      </div>
    );
  }

  // 未ログイン時は認証画面を表示
  if (!user) {
    return <AuthScreen />;
  }

  // ログイン時はメインアプリケーション画面を表示 (Step 4 にて本番用のレイアウトシェルに構築します)
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-slate-100 flex flex-col">
      {/* 仮ヘッダー */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            I
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent m-0">
              Ichimoku
            </h1>
            <span className="text-[10px] text-slate-500 font-medium">開発用プロトタイプ</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 bg-zinc-800/80 px-3 py-1.5 rounded-full border border-zinc-700/50">
            {user.email}
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-2 rounded-lg border border-transparent hover:border-rose-900/30 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            ログアウト
          </button>
        </div>
      </header>

      {/* 仮コンテンツエリア */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full flex flex-col items-center justify-center text-center gap-6">
        <div className="p-4 rounded-full bg-violet-900/10 border border-violet-800/20 text-violet-400 animate-pulse">
          <Layout className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">認証連携に成功しました</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            ユーザー専用セッションの隔離が確立されました。次のステップで、1画面・画面遷移ゼロのタスクボードとカレンダーのシェルレイアウトを構築します。
          </p>
        </div>

        {/* 次の予定ステップ表示 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-8 text-left">
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm">
              <Clock className="w-4 h-4" />
              近日締切レーン
            </div>
            <p className="text-xs text-slate-500">
              期日が迫るタスクを緊急度順に上部へ表示し、締切漏れを完全に防ぎます。
            </p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              タスクボード
            </div>
            <p className="text-xs text-slate-500">
              カテゴリ×状態の2次元マトリックス。dnd-kit を用いたドラッグで直感的にタスク管理。
            </p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-fuchsia-400 font-semibold text-sm">
              <Calendar className="w-4 h-4" />
              自作カレンダー
            </div>
            <p className="text-xs text-slate-500">
              ライブラリを使用せずドラッグ移動・リサイズ対応のカレンダーをフルスクラッチで実装。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
