import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/types";
import { useOverlay } from "@/store/OverlayContext";
import { dueUrgency, formatMd, urgencyClasses } from "@/lib/date";
import { cn } from "@/lib/utils";

/** 締切チップ（カード内・締切レーンで共用） */
export function DueChip({ dueDate }: { dueDate: string }) {
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
      締切 <span className="tabular">{formatMd(dueDate)}</span>
    </span>
  );
}

/** ボード上のタスクカード（フラット・ドラッグ可能・クリックで詳細） */
export function TaskCard({ task, showMemo }: { task: Task; showMemo: boolean }) {
  const { openTask } = useOverlay();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const done = task.status === "done";
  const memo = task.description.trim();

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => openTask(task.id)}
      className={cn(
        "flex w-full cursor-pointer touch-none flex-col gap-1.5 rounded-md border border-border bg-card p-2.5 text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-input hover:shadow-[var(--shadow-card-hover)]",
        done && "opacity-55",
        isDragging && "opacity-40"
      )}
    >
      <span
        className={cn("text-[13px] leading-snug", done && "text-muted-foreground line-through")}
      >
        {task.title}
      </span>
      {showMemo && memo ? (
        <p className="line-clamp-2 text-[11px] leading-snug whitespace-pre-wrap text-muted-foreground">
          {memo}
        </p>
      ) : null}
      {task.dueDate ? <DueChip dueDate={task.dueDate} /> : null}
    </button>
  );
}
