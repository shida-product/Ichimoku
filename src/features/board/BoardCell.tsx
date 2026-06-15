import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";

/** セル ID 生成: `${カテゴリキー}__${状態}`（カテゴリキー uncat = 未分類） */
export function cellId(categoryKey: string, status: string): string {
  return `${categoryKey}__${status}`;
}

export function parseCellId(id: string): { categoryKey: string; status: string } {
  const [categoryKey, status] = id.split("__");
  return { categoryKey, status };
}

/** ドロップ先となる (カテゴリ × 状態) のセル */
export function BoardCell({
  id,
  isDone,
  children,
  isEmpty,
  itemIds,
}: {
  id: string;
  isDone: boolean;
  children: React.ReactNode;
  isEmpty: boolean;
  /** このセル内のタスク id（並べ替え順） */
  itemIds: string[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[44px] flex-col gap-1.5 rounded-md p-1.5 transition-colors",
        isDone && "bg-secondary",
        isOver && "bg-accent ring-2 ring-primary/40"
      )}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      {isEmpty ? (
        <span className="px-1 py-2 text-center text-[11px] text-ink-3/60 select-none">—</span>
      ) : null}
    </div>
  );
}
