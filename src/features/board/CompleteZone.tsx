import { useDroppable } from "@dnd-kit/core";
import { CircleCheckBig, Undo2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 完了ドロップゾーンの droppable id（cellId と衝突しない固定値） */
export const DONE_ZONE_ID = "complete-zone";

/** ボード上に直近で表示する完了タスクの最大件数 */
const RECENT_LIMIT = 8;

/**
 * 共有の「完了」ドロップゾーン（§3.1 タスク消化）。
 * カードをここにドロップ＝完了（status=done / completed_at 記録）。記録は残り、
 * N日後に自動アーカイブで畳まれる。直近の完了をチップで表示し、取り消し（未着手へ戻す）も置く。
 * 本当の削除は詳細パネル側に分離（ここは消化＝完了であって削除ではない）。
 */
export function CompleteZone({
  doneTasks,
  onOpen,
  onUndo,
}: {
  doneTasks: Task[];
  onOpen: (id: string) => void;
  onUndo: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: DONE_ZONE_ID });

  // 直近完了順（completedAt 降順）に上位のみ表示
  const recent = [...doneTasks]
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, RECENT_LIMIT);

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
        <span className="text-ink-3">{doneTasks.length}</span>
        <span className="ml-auto font-normal text-ink-3">ここにドロップで消化</span>
      </div>

      {recent.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {recent.map((t) => (
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
