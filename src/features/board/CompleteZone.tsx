import { useDroppable } from "@dnd-kit/core";
import { CircleCheckBig, History } from "lucide-react";
import { cn } from "@/lib/utils";

/** 完了ドロップゾーンの droppable id（cellId と衝突しない固定値） */
export const DONE_ZONE_ID = "complete-zone";

/**
 * 共有の「完了」ドロップゾーン（§3.1 タスク消化）。
 * カードをここにドロップ＝完了＝**即アーカイブ**でボードから消える。
 * 誤操作の即時救済は undo トースト、後からの確認・取り消しは「履歴」が担うため、
 * ここはドロップ先＋件数＋履歴導線だけのすっきりした形にする。
 */
export function CompleteZone({
  totalCount,
  onOpenHistory,
}: {
  /** 完了（アーカイブ）総数 */
  totalCount: number;
  onOpenHistory: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: DONE_ZONE_ID });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-t border-border px-4 py-2.5 transition-colors",
        isOver && "bg-accent ring-2 ring-primary/40 ring-inset"
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.05em] text-muted-foreground">
        <CircleCheckBig className="size-3.5" />
        完了
        <span className="text-ink-3">{totalCount}</span>
        <span className="font-normal text-ink-3">ここにドロップで消化</span>
        <button
          type="button"
          onClick={onOpenHistory}
          className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-normal text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="完了履歴を開く"
        >
          <History className="size-3.5" />
          履歴
        </button>
      </div>
    </div>
  );
}
