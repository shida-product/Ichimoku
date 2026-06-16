import { useDroppable } from "@dnd-kit/core";
import { CircleCheckBig, History, Undo2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 完了ドロップゾーンの droppable id（cellId と衝突しない固定値） */
export const DONE_ZONE_ID = "complete-zone";

/** ボード上に直近で表示する完了タスクの最大件数 */
const RECENT_LIMIT = 8;

/**
 * 共有の「完了」ドロップゾーン（§3.1 タスク消化）。
 * カードをここにドロップ＝完了（status=done / completed_at 記録）＝**即アーカイブ**でボードから消える。
 * 直近の完了をチップで表示し、取り消し（未着手へ戻す）も置く。全件は「履歴」から参照（30日で物理削除）。
 */
export function CompleteZone({
  recent,
  totalCount,
  onOpen,
  onUndo,
  onOpenHistory,
}: {
  /** 直近の完了（アーカイブ済み・完了日時の降順） */
  recent: Task[];
  /** 完了（アーカイブ）総数 */
  totalCount: number;
  onOpen: (id: string) => void;
  onUndo: (id: string) => void;
  onOpenHistory: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: DONE_ZONE_ID });
  const chips = recent.slice(0, RECENT_LIMIT);

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

      {chips.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary py-0.5 pr-1 pl-2 text-[11px]"
            >
              <button
                type="button"
                onClick={() => onOpen(t.id)}
                className="max-w-[140px] cursor-pointer truncate text-muted-foreground line-through hover:text-foreground"
                title={t.title || "（無題）"}
              >
                {t.title || "（無題）"}
              </button>
              <button
                type="button"
                onClick={() => onUndo(t.id)}
                title="未着手へ戻す"
                aria-label="未着手へ戻す"
                className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded text-ink-3 hover:bg-accent hover:text-foreground"
              >
                <Undo2 className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-ink-3/70">消化したタスクがここに集まります</p>
      )}
    </div>
  );
}
