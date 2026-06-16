import { useDraggable } from "@dnd-kit/core";
import { Clock } from "lucide-react";
import type { Task } from "@/lib/types";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { DEADLINE_PREFIX } from "@/features/board/BoardDndProvider";
import { useHighlight } from "@/features/board/HighlightContext";
import { daysLabel, dueUrgency, formatMd, urgencyClasses } from "@/lib/date";
import { cn } from "@/lib/utils";

/** 近日締切カード（ドラッグで完了ゾーンへ・クリックで詳細・ホバーでボード該当タスクを強調）。 */
function DeadlineCard({ task }: { task: Task }) {
  const { openTask } = useOverlay();
  const { setHighlightId, setHighlightDate } = useHighlight();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: DEADLINE_PREFIX + task.id,
  });
  const uc = urgencyClasses(dueUrgency(task.dueDate!));

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
        "w-[180px] shrink-0 cursor-pointer touch-none rounded-md border border-border bg-secondary px-3 py-2 text-left transition-colors hover:border-input",
        isDragging && "opacity-40"
      )}
    >
      <div className="truncate text-[13px] font-medium">{task.title}</div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-ink-3 tabular">{formatMd(task.dueDate!)}</span>
        <span className={`text-[12px] font-medium tabular ${uc.text}`}>
          {daysLabel(task.dueDate!)}
        </span>
      </div>
    </button>
  );
}

/**
 * 近日締切レーン（§3.4）。締切のある未完了タスクを締切順に常時表示。
 * 緊急度はラベル文字色で表現し、クリックで詳細／完了ゾーンへドラッグで消化できる。
 */
export function DeadlineRail() {
  const { tasks } = useAppData();

  const items = tasks
    .filter((t) => t.dueDate && t.status !== "done" && t.archivedAt === null)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  return (
    <section className="rounded-lg border border-border bg-card px-3.5 py-3">
      <div className="mb-2 flex items-center gap-2.5">
        <Clock className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium tracking-[0.04em] text-muted-foreground">
          近日締切
        </span>
        <span className="text-[11px] text-ink-3">
          締切順・常に表示・クリックで詳細／完了ゾーンへドラッグ
        </span>
      </div>

      {items.length === 0 ? (
        <p className="px-1 py-1 text-xs text-ink-3">締切のあるタスクはまだありません</p>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {items.map((t) => (
            <DeadlineCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
}
