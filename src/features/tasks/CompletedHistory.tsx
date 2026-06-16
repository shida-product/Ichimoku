import { Undo2 } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { PanelShell } from "@/features/_shared/panel";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/**
 * 完了履歴（side-peek）。完了＝即アーカイブされたタスクを完了順（新しい順）に並べる。
 * クリックで詳細、↶で未着手へ戻す。30日経過で DB からも自動削除される旨を明示。
 */
export function CompletedHistory({ onClose }: { onClose: () => void }) {
  const { archivedTasks, categories, uncompleteTask } = useAppData();
  const { openTask } = useOverlay();

  const catName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? "未分類") : "未分類";

  const footer = (
    <p className="text-[11px] text-ink-3">
      完了したタスクはここに新しい順で残り、<strong>30日</strong>経過で自動的に削除されます。
    </p>
  );

  return (
    <PanelShell label="完了履歴" onClose={onClose} footer={footer}>
      {archivedTasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          完了したタスクはまだありません。
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {archivedTasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-md border border-border bg-card p-2"
            >
              <button
                type="button"
                onClick={() => openTask(t.id)}
                className="min-w-0 flex-1 cursor-pointer text-left"
              >
                <span className="block truncate text-[13px] text-muted-foreground line-through">
                  {t.title || "（無題）"}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-3">
                  {catName(t.categoryId)}
                  {t.completedAt ? ` ・ ${fmtDate(t.completedAt)} 完了` : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => uncompleteTask(t.id)}
                title="未着手へ戻す"
                aria-label="未着手へ戻す"
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded text-ink-3 transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Undo2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
