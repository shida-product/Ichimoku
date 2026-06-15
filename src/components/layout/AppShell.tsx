import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { Button } from "@/components/ui/button";
import { SidePeek } from "@/components/overlay/SidePeek";
import { Board } from "@/features/board/Board";
import { Calendar } from "@/features/calendar/Calendar";
import { DeadlineRail } from "@/features/deadlines/DeadlineRail";
import { TaskDetailPanel } from "@/features/tasks/TaskDetailPanel";
import { CategoryManager } from "@/features/categories/CategoryManager";
import { EventDetailPanel } from "@/features/calendar/EventDetailPanel";

/**
 * AppShell — 1画面・遷移ゼロのベースレイアウト（仕様 §7 / §3.7）。
 * トップバー／近日締切レーン／ワークスペース（ボード｜カレンダー）を固定配置し、
 * 編集・追加はオーバーレイ（side-peek）で重ねる。
 * タスク追加・予定追加の入口は各ブロック（ボード／カレンダー）のヘッダに配置し、
 * 追加と編集は同一の詳細パネルに一本化している。
 */
export function AppShell() {
  const { user, signOut } = useAuth();
  const { tasks, events, deleteTask, deleteEvent } = useAppData();
  const { active, openCategory, close } = useOverlay();

  // 閉じる際、空のまま終えた下書き（追加直後で未入力）は破棄する
  const closePeek = () => {
    if (active.kind === "task" && active.draft) {
      const t = tasks.find((x) => x.id === active.taskId);
      if (t && !t.title.trim()) deleteTask(t.id);
    } else if (active.kind === "event" && active.draft) {
      const e = events.find((x) => x.id === active.eventId);
      if (e && !e.title.trim()) deleteEvent(e.id);
    }
    close();
  };

  // side-peek（task / category / event）の中身を 1 枚で出し分け
  const peek =
    active.kind === "task"
      ? { label: "タスク", node: <TaskDetailPanel taskId={active.taskId} onClose={closePeek} /> }
      : active.kind === "category"
        ? { label: "カテゴリ管理", node: <CategoryManager onClose={closePeek} /> }
        : active.kind === "event"
          ? {
              label: "予定",
              node: <EventDetailPanel eventId={active.eventId} onClose={closePeek} />,
            }
          : null;

  return (
    <div className="mx-auto flex h-screen max-w-[1320px] flex-col overflow-hidden">
      {/* ── トップバー ── */}
      <header className="flex items-center gap-3 px-[22px] pt-[14px] pb-2">
        <h1 className="m-0 font-display text-[22px] font-bold tracking-[0.04em]">Ichimoku</h1>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openCategory}>
            <Settings />
            カテゴリ
          </Button>
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
        onOpenChange={(o) => !o && closePeek()}
        label={peek?.label ?? "詳細パネル"}
      >
        {peek?.node}
      </SidePeek>
    </div>
  );
}
