import { useDraggable } from "@dnd-kit/core";
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
export function TaskCard({ task }: { task: Task }) {
  const { openTask } = useOverlay();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const done = task.status === "done";

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...attributes}
      {...listeners}
      onClick={() => openTask(task.id)}
      className={cn(
        "flex w-full cursor-pointer touch-none flex-col gap-1.5 rounded-md border border-border bg-card p-2.5 text-left transition-colors hover:border-input",
        done && "opacity-55",
        isDragging && "opacity-40"
      )}
    >
      <span
        className={cn("text-[13px] leading-snug", done && "text-muted-foreground line-through")}
      >
        {task.title}
      </span>
      {task.dueDate ? <DueChip dueDate={task.dueDate} /> : null}
    </button>
  );
}
