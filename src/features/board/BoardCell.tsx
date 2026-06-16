import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";

/**
 * セル ID 生成: `${カテゴリキー}__cell`（カテゴリキー uncat = 未分類）。
 * 画面構成見直しで状態列を廃止したため、ドロップ先はカテゴリ単位の単一リスト。
 * カード id（UUID）と衝突しないよう `__cell` を付ける。
 */
export function cellId(categoryKey: string): string {
  return `${categoryKey}__cell`;
}

export function parseCellId(id: string): { categoryKey: string } {
  const [categoryKey] = id.split("__");
  return { categoryKey };
}

/** ドロップ先となるカテゴリのリスト領域 */
export function BoardCell({
  id,
  children,
  isEmpty,
  itemIds,
}: {
  id: string;
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
