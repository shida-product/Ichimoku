import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Loader2, LogIn, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { IS_PREVIEW } from "@/lib/preview";

export function AuthScreen() {
  const { signInMock } = useAuth();
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

    if (IS_PREVIEW) {
      setTimeout(() => {
        if (mode === "signin") {
          signInMock?.(email.trim() || "preview@example.com");
        } else {
          setMessage(
            "確認メールを送信しました。(デモ動作のため実際には送信されません。このままログインタブからログインしてください。)"
          );
        }
        setLoading(false);
      }, 500);
      return;
    }

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error, data } = await supabase.auth.signUp({ email, password });
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

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="m-0 font-display text-3xl font-bold tracking-[0.04em] text-foreground">
            Ichimoku
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            経営者のための 1画面・タスク消化型ツール
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-[0_8px_24px_rgba(20,30,28,0.06)]">
          {/* モード切替タブ */}
          <div className="mb-6 flex border-b border-border">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex flex-1 items-center justify-center gap-2 pb-3 text-sm font-semibold transition-colors ${
                mode === "signin"
                  ? "border-b-2 border-primary text-primary"
                  : "text-ink-3 hover:text-foreground"
              }`}
            >
              <LogIn className="size-4" />
              ログイン
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex flex-1 items-center justify-center gap-2 pb-3 text-sm font-semibold transition-colors ${
                mode === "signup"
                  ? "border-b-2 border-primary text-primary"
                  : "text-ink-3 hover:text-foreground"
              }`}
            >
              <UserPlus className="size-4" />
              アカウント登録
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate={IS_PREVIEW} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 rounded-md border border-crit-soft bg-crit-soft p-3 text-sm text-crit">
                <AlertCircle className="size-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-start gap-3 rounded-md border border-accent bg-accent p-3 text-sm text-accent-foreground">
                <CheckCircle2 className="size-5 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider text-muted-foreground">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
                <input
                  type="email"
                  required={!IS_PREVIEW}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-input bg-card py-2.5 pr-4 pl-10 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50 placeholder:text-ink-3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider text-muted-foreground">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
                <input
                  type="password"
                  required={!IS_PREVIEW}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-input bg-card py-2.5 pr-4 pl-10 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50 placeholder:text-ink-3"
                />
              </div>
            </div>

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  処理中…
                </>
              ) : mode === "signin" ? (
                "ログイン"
              ) : (
                "新規アカウント登録"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
