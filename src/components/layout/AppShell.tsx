import { useState } from "react";
import { Calendar as CalendarIcon, LogOut, Plus, Settings } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { Button } from "@/components/ui/button";
import { SidePeek } from "@/components/overlay/SidePeek";
import { AnchoredPopover } from "@/components/overlay/AnchoredPopover";
import { Board } from "@/features/board/Board";
import { Calendar } from "@/features/calendar/Calendar";
import { DeadlineRail } from "@/features/deadlines/DeadlineRail";
import { TaskDetailPanel } from "@/features/tasks/TaskDetailPanel";
import { CategoryManager } from "@/features/categories/CategoryManager";
import { EventDetailPanel } from "@/features/calendar/EventDetailPanel";
import { EventAddForm } from "@/features/calendar/EventAddForm";

/**
 * AppShell — 1画面・遷移ゼロのベースレイアウト（仕様 §7 / §3.7）。
 * トップバー／近日締切レーン／ワークスペース（ボード｜カレンダー）を固定配置し、
 * 編集・追加はオーバーレイ（side-peek / ポップ）で重ねる。
 */
export function AppShell() {
  const { user, signOut } = useAuth();
  const { addTask } = useAppData();
  const { active, openCategory, openEventAdd, close } = useOverlay();
  const [quickTitle, setQuickTitle] = useState("");

  const submitQuick = () => {
    if (!quickTitle.trim()) return;
    addTask({ title: quickTitle });
    setQuickTitle("");
  };

  // side-peek（task / category / event）の中身を 1 枚で出し分け
  const peek =
    active.kind === "task"
      ? { label: "タスク詳細", node: <TaskDetailPanel taskId={active.taskId} /> }
      : active.kind === "category"
        ? { label: "カテゴリ管理", node: <CategoryManager /> }
        : active.kind === "event"
          ? { label: "予定の詳細", node: <EventDetailPanel eventId={active.eventId} /> }
          : null;

  return (
    <div className="mx-auto flex h-screen max-w-[1320px] flex-col overflow-hidden">
      {/* ── トップバー ── */}
      <header className="flex flex-wrap items-center gap-3 px-[22px] pt-[14px] pb-2">
        <div className="flex items-baseline gap-2.5">
          <h1 className="m-0 text-[21px] font-bold tracking-[0.02em]">Ichimoku</h1>
          <span className="hidden text-xs text-ink-3 sm:inline">考えさせない・忘れさせない</span>
        </div>

        {/* クイック追加（Enter で未分類に即タスク化） */}
        <div className="flex min-w-[200px] max-w-[440px] flex-1 items-center gap-2 rounded-md border border-input bg-card px-2.5 focus-within:border-ring">
          <Plus className="size-3.5 shrink-0 text-ink-3" />
          <input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitQuick()}
            placeholder="タスクをパッと追加（Enter）— 未分類に入ります"
            className="flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-ink-3"
          />
          <span className="hidden whitespace-nowrap text-[11px] text-ink-3 sm:inline">
            未分類へ
          </span>
        </div>

        <Button variant="outline" size="sm" onClick={openCategory}>
          <Settings />
          カテゴリ
        </Button>

        {/* ＋予定: 軽量ポップ */}
        <AnchoredPopover
          open={active.kind === "eventAdd"}
          onOpenChange={(o) => (o ? openEventAdd() : close())}
          title="予定を追加（今日）"
          trigger={
            <Button variant="outline" size="sm">
              <CalendarIcon />
              予定
            </Button>
          }
        >
          <EventAddForm />
        </AnchoredPopover>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground md:inline">
            {user?.email ?? "プレビュー（モックデータ）"}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut />
            ログアウト
          </Button>
        </div>
      </header>

      {/* ── 本体 ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-[22px] pt-2 pb-4">
        <DeadlineRail />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
          <Board />
          <Calendar />
        </div>
      </div>

      {/* side-peek（1 枚） */}
      <SidePeek
        open={peek !== null}
        onOpenChange={(o) => !o && close()}
        label={peek?.label ?? "詳細パネル"}
      >
        {peek?.node}
      </SidePeek>
    </div>
  );
}
