import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Clock } from "lucide-react";
import type { Task } from "@/lib/types";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { DEADLINE_PREFIX } from "@/features/board/BoardDndProvider";
import { useHighlight } from "@/features/board/HighlightContext";
import { daysLabel, dueUrgency, formatDue, urgencyClasses } from "@/lib/date";
import { cn } from "@/lib/utils";

/** 近日締切カード（ドラッグで完了ゾーンへ・クリックで詳細・ホバーで連動ハイライト）。
    ボード／カレンダーの該当タスクにホバーされた際は、このカードもハイライトする（双方向）。 */
function DeadlineCard({ task }: { task: Task }) {
  const { openTask } = useOverlay();
  const { highlightId, setHighlightId, setHighlightDate } = useHighlight();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: DEADLINE_PREFIX + task.id,
  });
  const uc = urgencyClasses(dueUrgency(task.dueDate!));
  const highlighted = highlightId === task.id;

  const enter = () => {
    setHighlightId(task.id);
    setHighlightDate(task.dueDate);
  };
  const leave = () => {
    setHighlightId(null);
    setHighlightDate(null);
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => openTask(task.id)}
      onPointerEnter={enter}
      onPointerLeave={leave}
      className={cn(
        "w-full cursor-pointer touch-none rounded-md border px-3 py-2 text-left transition-colors",
        // 連動ハイライトはボード(TaskCard)・カレンダー(該当日)と同一指定に統一: warn-soft 地＋warn リング。
        highlighted
          ? "border-warn bg-warn-soft ring-2 ring-warn/50"
          : "border-border bg-secondary hover:border-input",
        isDragging && "opacity-40"
      )}
    >
      <div className="truncate text-[13px] font-medium">{task.title}</div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-ink-3 tabular">
          {formatDue(task.dueDate!, task.dueTime)}
        </span>
        <span className={`text-[12px] font-medium tabular ${uc.text}`}>
          {daysLabel(task.dueDate!)}
        </span>
      </div>
    </button>
  );
}

/** 既定で表示する締切件数の上限。これを超えた分は「他◯件を表示」で展開する。 */
const VISIBLE_LIMIT = 10;

/**
 * 締切カラム（§3.4）。締切のある未完了タスクを締切順（昇順）に縦並びで表示。
 * 3カラムレイアウト（締切｜ボード｜カレンダー）の左カラムとして、常時一覧でき見落としを防ぐ。
 * 既定は直近 VISIBLE_LIMIT 件のみ表示し、残りは「他◯件を表示」で展開できる（全件は保持）。
 * 緊急度はラベル文字色で表現し、クリックで詳細／完了ゾーンへドラッグで消化できる。
 */
export function DeadlineRail() {
  const { tasks } = useAppData();
  const [expanded, setExpanded] = useState(false);

  const items = tasks
    .filter((t) => t.dueDate && t.status !== "done" && t.archivedAt === null)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  const hidden = Math.max(0, items.length - VISIBLE_LIMIT);
  const shown = expanded ? items : items.slice(0, VISIBLE_LIMIT);

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
      {/* ヘッダー高さは 3 カラム共通の 52px（ボード/カレンダーのボタン h-7 を含む行に合わせる） */}
      <div className="flex h-[52px] items-center gap-2 border-b border-border px-4">
        <span className="flex items-center gap-2 font-display text-[15px] font-bold">
          <Clock className="size-4 text-muted-foreground" />
          締切
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-3.5 py-3 text-xs text-ink-3">締切のあるタスクはまだありません</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {shown.map((t) => (
            <DeadlineCard key={t.id} task={t} />
          ))}
          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 shrink-0 cursor-pointer rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {expanded ? "閉じる" : `他 ${hidden} 件を表示`}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
