import { useDroppable } from "@dnd-kit/core";
import { CircleCheckBig, History } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="border-t border-border px-4 py-3">
      {/* 未分類の空ゾーンと同じ破線ドロップゾーンに統一。当たり判定（ref）と
          ホバー強調（isOver）を BoardCell と同じくこのボックスに一致させる。 */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[64px] items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-[11px] font-medium tracking-[0.05em] text-muted-foreground transition-colors",
          isOver && "border-transparent bg-accent ring-2 ring-primary/40"
        )}
      >
        <CircleCheckBig className="size-3.5" />
        完了
        <span className="text-ink-3">{totalCount}</span>
        <span className="font-normal text-ink-3">ここにドロップで消化</span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={onOpenHistory}
          title="完了履歴を開く"
        >
          <History />
          履歴
        </Button>
      </div>
    </div>
  );
}
