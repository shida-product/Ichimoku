import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, Loader2, LogIn, UserPlus, AlertCircle } from "lucide-react";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data?.user && data.session === null) {
          setMessage("確認メールを送信しました。メールボックスをご確認ください。");
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "認証中にエラーが発生しました。";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-radial from-slate-900 via-zinc-950 to-black p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-900/15 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent mb-2">
            Ichimoku
          </h1>
          <p className="text-sm text-slate-400">経営者のための1画面・タスク消化型ツール</p>
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex border-b border-zinc-800 mb-6">
            <button
              onClick={() => {
                setMode("signin");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                mode === "signin"
                  ? "text-violet-400 border-b-2 border-violet-500"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <LogIn className="w-4 h-4" />
              ログイン
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                mode === "signup"
                  ? "text-violet-400 border-b-2 border-violet-500"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              アカウント登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-950/30 border border-red-900/50 text-red-300 p-4 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 p-4 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>{message}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-950/50 border border-zinc-800 text-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-zinc-600 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-950/50 border border-zinc-800 text-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-zinc-600 disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-lg py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-lg shadow-violet-950/20 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  処理中...
                </>
              ) : mode === "signin" ? (
                "ログイン"
              ) : (
                "新規アカウント登録"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
