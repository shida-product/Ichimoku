import { Archive, Plus, Trash2, X } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { STATUS_LABEL, STATUS_ORDER, type TaskLink } from "@/lib/types";
import { PanelShell, fieldClass, useSavedFlash } from "@/features/_shared/panel";

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
  const { tasks, categories, updateTask, deleteTask, archiveTask } = useAppData();
  const { saved, flash } = useSavedFlash();
  const task = tasks.find((t) => t.id === taskId);

  if (!task) return null;

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
        {/* 完了タスクは手動アーカイブ可（自動アーカイブは完了から7日後） */}
        {task.status === "done" ? (
          <button
            type="button"
            onClick={() => {
              archiveTask(task.id);
              onClose();
            }}
            className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            <Archive className="size-3.5" /> アーカイブ
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
        <textarea
          value={task.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="補足や手順（プレーンテキスト）"
          className={`${fieldClass} min-h-[64px] resize-y`}
        />
      </label>

      {/* リンク */}
      <div>
        <span className="mb-1.5 block text-xs text-muted-foreground">リンク</span>
        <div className="flex flex-col gap-1.5">
          {task.links.map((link, i) => (
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
              <button
                type="button"
                aria-label="リンクを削除"
                onClick={() => removeLink(i)}
                className="shrink-0 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
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

      {/* カテゴリ / 状態 */}
      <div className="flex gap-3">
        <label className="flex-1">
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
        <label className="flex-1">
          <span className="mb-1.5 block text-xs text-muted-foreground">状態</span>
          <select
            value={task.status}
            onChange={(e) => patch({ status: e.target.value as typeof task.status })}
            className={fieldClass}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </PanelShell>
  );
}
