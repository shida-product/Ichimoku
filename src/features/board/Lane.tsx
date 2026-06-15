import { ChevronDown } from "lucide-react";
import type { Task } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";
import { BoardCell, cellId } from "@/features/board/BoardCell";
import { TaskCard } from "@/features/board/TaskCard";
import { cn } from "@/lib/utils";

/** カテゴリ 1 行（スイムレーン）。横 3 列＝状態。折りたたみ可。 */
export function Lane({
  categoryKey,
  name,
  color,
  tasks,
  collapsed,
  onToggle,
  showMemo,
  muted,
}: {
  categoryKey: string;
  name: string;
  color: string;
  tasks: Task[];
  collapsed: boolean;
  onToggle: () => void;
  showMemo: boolean;
  /** 未分類レーン用の控えめな見た目 */
  muted?: boolean;
}) {
  return (
    <div className="border-b-2 border-border px-4 py-1.5 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2 py-1.5 select-none"
      >
        <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
        <span className={cn("text-[13px] font-medium", muted && "text-muted-foreground")}>
          {name}
        </span>
        <span className="text-[11px] text-ink-3">{tasks.length}</span>
        <ChevronDown
          className={cn(
            "ml-auto size-3.5 text-ink-3 transition-transform",
            collapsed && "-rotate-90"
          )}
        />
      </button>

      {!collapsed && (
        <div className="grid grid-cols-3 gap-2.5 pb-1.5">
          {STATUS_ORDER.map((status) => {
            const cards = tasks.filter((t) => t.status === status);
            return (
              <BoardCell
                key={status}
                id={cellId(categoryKey, status)}
                isDone={status === "done"}
                isEmpty={cards.length === 0}
              >
                {cards.map((t) => (
                  <TaskCard key={t.id} task={t} showMemo={showMemo} />
                ))}
              </BoardCell>
            );
          })}
        </div>
      )}
    </div>
  );
}
