import { useSortable } from "@dnd-kit/sortable";
import { ChevronDown, GripVertical } from "lucide-react";
import type { Task } from "@/lib/types";
import { BoardCell, cellId } from "@/features/board/BoardCell";
import { CATEGORY_PREFIX } from "@/features/board/BoardDndProvider";
import { TaskCard } from "@/features/board/TaskCard";
import { tint } from "@/lib/palette";
import { cn } from "@/lib/utils";

/**
 * カテゴリ 1 まとまり。状態列は廃止し、カテゴリごとの単一リスト。
 * 「対応中」は列ではなくカード上の★フラグで表す（案B）。折りたたみ可。
 *
 * - variant="column": カテゴリを横並びにするカンバン型の縦長カラム（ハンドルで列ごと並べ替え可）。
 * - variant="row":    全幅のスイムレーン（未分類はこちらで先頭に据え置く・並べ替え不可）。
 */
export function Lane({
  categoryKey,
  name,
  color,
  tasks,
  collapsed,
  onToggle,
  muted,
  variant = "row",
}: {
  categoryKey: string;
  name: string;
  color: string;
  tasks: Task[];
  collapsed: boolean;
  onToggle: () => void;
  /** 未分類レーン用の控えめな見た目 */
  muted?: boolean;
  variant?: "column" | "row";
}) {
  const isColumn = variant === "column";
  // 列モードのみ並べ替え対象（未分類の行は disabled）。
  // 並べ替え中の transform は適用しない：列分配マソンリー（別 div へ分散）と
  // dnd-kit のシフト計算が噛み合わず、特に折りたたみ時にレイアウトが崩れるため。
  // ドラッグ中は DragOverlay を表示し、ドロップ時にデータ駆動で順序を確定する。
  const { setNodeRef, attributes, listeners, isDragging } = useSortable({
    id: CATEGORY_PREFIX + categoryKey,
    disabled: !isColumn,
  });

  const title = (
    <>
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
    </>
  );

  const body = !collapsed && (
    <div className={cn(isColumn ? "p-2" : "px-4 pt-2 pb-3")}>
      <BoardCell
        id={cellId(categoryKey)}
        isEmpty={tasks.length === 0}
        itemIds={tasks.map((t) => t.id)}
        grid={!isColumn}
      >
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </BoardCell>
    </div>
  );

  if (isColumn) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex w-full flex-col self-start overflow-hidden rounded-lg border border-border bg-card",
          isDragging && "opacity-40"
        )}
      >
        {/* 見出し帯（左にドラッグハンドル＝列移動、本体クリックで折りたたみ） */}
        <div className="flex items-stretch" style={{ backgroundColor: tint(color, 18) }}>
          <button
            type="button"
            aria-label="列をドラッグして並べ替え"
            title="ドラッグで列を並べ替え"
            {...attributes}
            {...listeners}
            className="flex cursor-grab touch-none items-center pr-0.5 pl-2 text-ink-3/70 hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="flex flex-1 cursor-pointer items-center gap-2 py-2 pr-3 pl-1 select-none"
          >
            {title}
          </button>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        style={{ backgroundColor: tint(color, 18) }}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 select-none"
      >
        {title}
      </button>
      {body}
    </div>
  );
}
