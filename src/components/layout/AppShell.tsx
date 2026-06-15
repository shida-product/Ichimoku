import { useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { SidePeek } from "@/components/overlay/SidePeek";
import { AnchoredPopover } from "@/components/overlay/AnchoredPopover";
import { Calendar, Clock, Layout, LogOut, Plus, Settings } from "lucide-react";

/**
 * AppShell — 1画面・遷移ゼロのベースレイアウト（仕様 §7 / §3.7）。
 *
 * 構成: トップバー（ブランド・クイック追加・カテゴリ・＋予定・アカウント）
 *       ／ 近日締切レーン ／ ワークスペース（タスクボード｜カレンダー）。
 * 中身（ボード・カレンダー・各 CRUD）は後続ステップで充填する。ここでは
 * 固定レイアウトとオーバーレイ基盤（side-peek / pop）の土台のみを確定する。
 *
 * オーバーレイは §3.7 の規律に従い「常に 1 枚だけ」を本コンポーネントで一元管理する。
 */
type ActiveOverlay = "none" | "category" | "event";

export function AppShell() {
  const { user, signOut } = useAuth();
  const [overlay, setOverlay] = useState<ActiveOverlay>("none");
  const [quickTitle, setQuickTitle] = useState("");

  // 1 枚だけ開く: 新しく開く＝前を閉じる
  const openOverlay = (next: ActiveOverlay) => setOverlay(next);
  const closeOverlay = () => setOverlay("none");

  return (
    <div className="mx-auto flex h-screen max-w-[1320px] flex-col overflow-hidden">
      {/* ── トップバー ── */}
      <header className="flex flex-wrap items-center gap-3 px-[22px] pt-[14px] pb-2">
        <div className="flex items-baseline gap-2.5">
          <h1 className="m-0 text-[21px] font-bold tracking-[0.02em]">Ichimoku</h1>
          <span className="hidden text-xs text-ink-3 sm:inline">考えさせない・忘れさせない</span>
        </div>

        {/* クイック追加（永続化は Step 6）。入口だけ常時表示で確保する。 */}
        <div className="flex min-w-[200px] max-w-[440px] flex-1 items-center gap-2 rounded-md border border-input bg-card px-2.5">
          <Plus className="size-3.5 shrink-0 text-ink-3" />
          <input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="タスクをパッと追加（Enter）— 未分類に入ります"
            className="flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-ink-3"
          />
          <span className="hidden whitespace-nowrap text-[11px] text-ink-3 sm:inline">
            未分類へ
          </span>
        </div>

        <Button variant="outline" size="sm" onClick={() => openOverlay("category")}>
          <Settings />
          カテゴリ
        </Button>

        {/* ＋予定: 軽量ポップ（events への保存は Step 10） */}
        <AnchoredPopover
          open={overlay === "event"}
          onOpenChange={(o) => (o ? openOverlay("event") : closeOverlay())}
          title="予定を追加（今日）"
          trigger={
            <Button variant="outline" size="sm">
              <Calendar />
              予定
            </Button>
          }
        >
          <div className="flex flex-col gap-2">
            <input
              placeholder="時刻 例 14:00"
              className="tabular w-full rounded-md border border-input bg-card px-2 py-2 text-[13px] outline-none placeholder:text-ink-3"
            />
            <input
              placeholder="タイトル 例 MR面談"
              className="w-full rounded-md border border-input bg-card px-2 py-2 text-[13px] outline-none placeholder:text-ink-3"
            />
            <Button size="sm" className="w-full" disabled>
              追加（Step 10 で実装）
            </Button>
          </div>
        </AnchoredPopover>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground md:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut />
            ログアウト
          </Button>
        </div>
      </header>

      {/* ── 本体（内部スクロール。ページ全体はスクロールさせない） ── */}
      <div className="flex-1 overflow-auto px-[22px] pt-2 pb-10">
        {/* 近日締切レーン（常時表示の細ストリップ） */}
        <section className="mb-4 rounded-lg border border-border bg-card px-3.5 py-3">
          <div className="mb-2 flex items-center gap-2.5">
            <Clock className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium tracking-[0.04em] text-muted-foreground">
              近日締切
            </span>
            <span className="text-[11px] text-ink-3">締切順・常に表示・クリックで詳細</span>
          </div>
          <p className="px-1 py-1 text-xs text-ink-3">締切のあるタスクはまだありません</p>
        </section>

        {/* ワークスペース（左:ボード / 右:カレンダー） */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
          {/* タスクボード */}
          <section className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-bold">
                <Layout className="size-4 text-muted-foreground" />
                タスクボード
              </span>
              <span className="text-[11px] text-ink-3">縦＝カテゴリ ／ 横＝状態</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 px-4 pt-3 text-[11px] font-medium tracking-[0.05em] text-muted-foreground">
              <span>未着手</span>
              <span>対応中</span>
              <span className="text-ink-3">完了</span>
            </div>
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">まだタスクがありません</p>
              <p className="text-xs text-ink-3">
                上のクイック追加から最初のタスクを登録できます（Step 6）
              </p>
            </div>
          </section>

          {/* カレンダー（予定専用） */}
          <section className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-bold">
                <Calendar className="size-4 text-muted-foreground" />
                カレンダー
              </span>
              <span className="text-[11px] text-ink-3">予定専用</span>
            </div>
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">予定はまだありません</p>
              <p className="text-xs text-ink-3">「予定」ボタンから追加できます（Step 10）</p>
            </div>
          </section>
        </div>

        <p className="pt-2.5 text-center text-[11px] text-ink-3">
          1画面・遷移ゼロ ／ 編集は右からスライドイン・追加はポップで完結
        </p>
      </div>

      {/* カテゴリ管理 side-peek（中身は Step 5） */}
      <SidePeek
        open={overlay === "category"}
        onOpenChange={(o) => (o ? openOverlay("category") : closeOverlay())}
        label="カテゴリ管理"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
          <Settings className="size-8 text-ink-3" />
          <p className="text-sm text-muted-foreground">
            カテゴリの作成・リネーム・並べ替えは Step 5 で実装します
          </p>
        </div>
      </SidePeek>
    </div>
  );
}
