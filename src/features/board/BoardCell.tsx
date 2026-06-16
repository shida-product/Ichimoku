import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
  grid,
}: {
  id: string;
  children: React.ReactNode;
  isEmpty: boolean;
  /** このセル内のタスク id（並べ替え順） */
  itemIds: string[];
  /** 全幅レーン（未分類）向けに 1 行 3 枚のグリッド配置にする */
  grid?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[44px] gap-1.5 rounded-md p-1.5 transition-colors",
        grid ? "grid grid-cols-3" : "flex flex-col",
        isOver && "bg-accent ring-2 ring-primary/40"
      )}
    >
      <SortableContext
        items={itemIds}
        strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
      {isEmpty ? (
        // 空のときも確実に狙えるドロップ先にする。的が小さいと届かないため、
        // 破線の広いゾーン＋ヒント文言を出す（未分類=grid と各カテゴリで文言を変える）。
        <span
          className={cn(
            "col-span-full flex h-16 select-none items-center justify-center rounded-md border border-dashed border-border text-center text-[11px] text-ink-3/60"
          )}
        >
          {grid ? "ここにドロップで未分類へ" : "ここにドロップ"}
        </span>
      ) : null}
    </div>
  );
}
