import { Undo2 } from "lucide-react";

/**
 * 完了直後の取り消しトースト。完了＝即アーカイブで DB から消える設計のため、
 * 誤ドロップ救済として数秒だけ「取り消す」を提示する（消えても履歴から戻せる）。
 */
export function UndoToast({
  title,
  onUndo,
  onDismiss,
}: {
  title: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-foreground/90 py-1.5 pr-1.5 pl-4 text-[12px] text-background shadow-lg">
        <span className="max-w-[200px] truncate">「{title || "（無題）"}」を完了</span>
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-background/15 px-2.5 py-1 font-medium transition-colors hover:bg-background/25"
        >
          <Undo2 className="size-3.5" />
          取り消す
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="閉じる"
          className="flex size-6 cursor-pointer items-center justify-center rounded-full text-background/70 transition-colors hover:bg-background/15 hover:text-background"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
