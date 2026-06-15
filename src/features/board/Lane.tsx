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
    <div className="border-b border-border last:border-b-0">
      {/* カテゴリ見出し帯（フル幅・カテゴリ色の淡い地） */}
      <button
        type="button"
        onClick={onToggle}
        style={{ backgroundColor: `${color}2e` }}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 select-none"
      >
        <span
          className={cn("text-[13px] font-semibold", muted && "font-medium text-muted-foreground")}
        >
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
        <div className="grid grid-cols-3 gap-2.5 px-4 pt-2 pb-3">
          {STATUS_ORDER.map((status) => {
            const cards = tasks.filter((t) => t.status === status);
            return (
              <BoardCell
                key={status}
                id={cellId(categoryKey, status)}
                isDone={status === "done"}
                isEmpty={cards.length === 0}
                itemIds={cards.map((c) => c.id)}
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
