import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flag, Star } from "lucide-react";
import type { Task, TaskPriority } from "@/lib/types";
import { isFlagged } from "@/lib/types";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { useHighlight } from "@/features/board/HighlightContext";
import { dueUrgency, formatDue, urgencyClasses } from "@/lib/date";
import { cn } from "@/lib/utils";

/** 締切チップ（カード内・締切レーンで共用）。時刻があれば併記する。 */
export function DueChip({ dueDate, dueTime }: { dueDate: string; dueTime?: string | null }) {
  const uc = urgencyClasses(dueUrgency(dueDate));
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
        uc.text,
        uc.bg,
        uc.border
      )}
    >
      締切 <span className="tabular">{formatDue(dueDate, dueTime ?? null)}</span>
    </span>
  );
}

/**
 * 優先度の印（カード用）。既定（normal）は何も出さず、高/低のみ控えめに示す。
 * 高＝crit 系で目立たせ、低＝ミュート。色は締切緊急度（warn/crit）と衝突しないよう
 * アイコン＋小さなラベルで区別する。
 */
export function PriorityMark({ priority }: { priority: TaskPriority }) {
  if (priority === "normal") return null;
  const high = priority === "high";
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        high ? "bg-crit-soft text-crit" : "bg-secondary text-ink-3"
      )}
      title={`優先度: ${high ? "高" : "低"}`}
    >
      <Flag className={cn("size-2.5", high && "fill-current")} />
      {high ? "高" : "低"}
    </span>
  );
}

/**
 * ボード上のタスクカード（フラット・ドラッグ可能・クリックで詳細）。
 * 「対応中」は★フラグ（status=doing）で表す。★クリックでトグル（ドラッグ・詳細起動と分離）。
 */
export function TaskCard({ task }: { task: Task }) {
  const { openTask } = useOverlay();
  const { updateTask } = useAppData();
  const { highlightId, setHighlightId, setHighlightDate } = useHighlight();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const flagged = isFlagged(task.status);
  const highlighted = highlightId === task.id;
  const memo = task.description.trim();

  const toggleFlag = () => updateTask(task.id, { status: flagged ? "todo" : "doing" });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={() => openTask(task.id)}
      // ホバーで締切カラム／カレンダーの該当箇所を連動ハイライト（締切カードからの逆方向）。
      onPointerEnter={() => {
        setHighlightId(task.id);
        setHighlightDate(task.dueDate ?? null);
      }}
      onPointerLeave={() => {
        setHighlightId(null);
        setHighlightDate(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTask(task.id);
        }
      }}
      className={cn(
        "flex w-full cursor-pointer touch-none flex-col gap-1.5 rounded-md border p-2.5 text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow,background-color] hover:shadow-[var(--shadow-card-hover)]",
        flagged ? "border-primary/45 ring-1 ring-primary/20" : "border-border hover:border-input",
        // 近日締切カードにホバー中は該当タスクを強調（枠＝締切アクセント色、
        // 内部背景は枠より薄いソフト地色でじんわり点灯）
        highlighted ? "border-warn bg-warn-soft ring-2 ring-warn/50" : "bg-card",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-1.5">
        <span className="min-w-0 flex-1 text-[13px] leading-snug">{task.title}</span>
        <button
          type="button"
          aria-label={flagged ? "対応中を解除" : "対応中にする"}
          aria-pressed={flagged}
          title={flagged ? "対応中を解除" : "対応中にする"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            toggleFlag();
          }}
          className={cn(
            "-mt-0.5 -mr-0.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded transition-colors",
            flagged
              ? "text-primary hover:bg-primary/10"
              : "text-ink-3/50 hover:bg-secondary hover:text-foreground"
          )}
        >
          <Star className={cn("size-3.5", flagged && "fill-current")} />
        </button>
      </div>
      {memo ? (
        <p className="line-clamp-2 text-[11px] leading-snug whitespace-pre-wrap text-muted-foreground">
          {memo}
        </p>
      ) : null}
      {task.priority !== "normal" || task.dueDate ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityMark priority={task.priority} />
          {task.dueDate ? <DueChip dueDate={task.dueDate} dueTime={task.dueTime} /> : null}
        </div>
      ) : null}
    </div>
  );
}
