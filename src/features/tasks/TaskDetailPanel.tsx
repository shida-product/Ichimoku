import { ExternalLink, Plus, Star, Trash2, Undo2, X } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { isFlagged, type TaskLink } from "@/lib/types";
import { AutoTextarea, PanelShell, fieldClass, useSavedFlash } from "@/features/_shared/panel";

/**
 * 入力 URL を開ける形に正規化する。`http(s)://` 省略時は `https://` を補い、
 * クリックで開ける href を返す。開けない（空など）場合は null。
 */
function toHref(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/**
 * タスクの追加/編集（side-peek・共通枠）。自動保存（保存ボタンなし）。
 * 追加も既存編集も同じこのパネルで行う。
 */
export function TaskDetailPanel({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { tasks, archivedTasks, categories, updateTask, deleteTask, uncompleteTask } = useAppData();
  const { saved, flash } = useSavedFlash();
  // 詳細は active / archived（完了履歴）の両方から開かれる。
  const task = tasks.find((t) => t.id === taskId) ?? archivedTasks.find((t) => t.id === taskId);

  if (!task) return null;

  const done = task.status === "done";
  const flagged = isFlagged(task.status);

  const patch = (p: Parameters<typeof updateTask>[1]) => {
    updateTask(task.id, p);
    flash();
  };

  const setLink = (index: number, key: keyof TaskLink, value: string) => {
    const links = task.links.map((l, i) => (i === index ? { ...l, [key]: value } : l));
    patch({ links });
  };
  const addLink = () => patch({ links: [...task.links, { title: "", url: "" }] });
  const removeLink = (index: number) => patch({ links: task.links.filter((_, i) => i !== index) });

  const footer = (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-ink-3">
        作成 {fmtDateTime(task.createdAt)} ・ 更新 {fmtDateTime(task.updatedAt)}
      </span>
      <div className="flex items-center gap-3">
        {/* 完了タスク（完了履歴から開いた場合）は未着手へ戻せる */}
        {done ? (
          <button
            type="button"
            onClick={() => {
              uncompleteTask(task.id);
              onClose();
            }}
            className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            <Undo2 className="size-3.5" /> 未着手へ戻す
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            deleteTask(task.id);
            onClose();
          }}
          className="inline-flex items-center gap-1 text-[13px] text-crit transition-colors hover:underline"
        >
          <Trash2 className="size-3.5" /> 削除
        </button>
      </div>
    </div>
  );

  return (
    <PanelShell label="タスク" saved={saved} onClose={onClose} footer={footer}>
      {/* タイトル */}
      <input
        value={task.title}
        onChange={(e) => patch({ title: e.target.value })}
        autoFocus={task.title === ""}
        className="border-b border-border pb-1.5 text-base font-medium outline-none focus:border-ring"
        placeholder="タイトル"
      />

      {/* メモ */}
      <label className="block">
        <span className="mb-1.5 block text-xs text-muted-foreground">メモ</span>
        <AutoTextarea
          value={task.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="補足や手順（プレーンテキスト）"
          className="min-h-[64px]"
        />
      </label>

      {/* リンク */}
      <div>
        <span className="mb-1.5 block text-xs text-muted-foreground">リンク</span>
        <div className="flex flex-col gap-1.5">
          {task.links.map((link, i) => {
            const href = toHref(link.url);
            return (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={link.title}
                  onChange={(e) => setLink(i, "title", e.target.value)}
                  placeholder="ラベル（任意）"
                  className={fieldClass}
                />
                <input
                  value={link.url}
                  onChange={(e) => setLink(i, "url", e.target.value)}
                  placeholder="https://…"
                  className={`${fieldClass} text-primary`}
                />
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="リンクを開く"
                    title={`開く: ${href}`}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : (
                  <span
                    aria-hidden
                    className="shrink-0 p-1.5 text-ink-3/40"
                    title="URL を入力すると開けます"
                  >
                    <ExternalLink className="size-3.5" />
                  </span>
                )}
                <button
                  type="button"
                  aria-label="リンクを削除"
                  onClick={() => removeLink(i)}
                  className="shrink-0 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addLink}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-3.5" /> リンクを追加
        </button>
      </div>

      {/* 締切（プログレッシブ表示） */}
      <div>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] select-none">
          <input
            type="checkbox"
            checked={task.dueDate !== null}
            onChange={(e) =>
              patch({ dueDate: e.target.checked ? (task.dueDate ?? "2026-06-20") : null })
            }
            className="size-4 accent-primary"
          />
          締切を設定
        </label>
        {task.dueDate !== null && (
          <input
            type="date"
            value={task.dueDate}
            onChange={(e) => patch({ dueDate: e.target.value || null })}
            className={`${fieldClass} mt-2`}
          />
        )}
      </div>

      {/* カテゴリ */}
      <label className="block">
        <span className="mb-1.5 block text-xs text-muted-foreground">カテゴリ</span>
        <select
          value={task.categoryId ?? ""}
          onChange={(e) => patch({ categoryId: e.target.value || null })}
          className={fieldClass}
        >
          <option value="">未分類</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* 対応中フラグ（状態列の代わり。完了タスクでは表示しない） */}
      {done ? (
        <p className="inline-flex w-fit items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-[12px] text-muted-foreground">
          完了済み（完了履歴に保存中）
        </p>
      ) : (
        <button
          type="button"
          aria-pressed={flagged}
          onClick={() => patch({ status: flagged ? "todo" : "doing" })}
          className={`inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] transition-colors ${
            flagged
              ? "border-primary/45 bg-primary/10 text-primary"
              : "border-input text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Star className={`size-3.5 ${flagged ? "fill-current" : ""}`} />
          {flagged ? "対応中" : "対応中にする"}
        </button>
      )}
    </PanelShell>
  );
}
