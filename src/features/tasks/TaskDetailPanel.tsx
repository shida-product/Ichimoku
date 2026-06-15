import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { STATUS_LABEL, STATUS_ORDER, type TaskLink } from "@/lib/types";

const fieldClass =
  "w-full rounded-md border border-input bg-card px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25 placeholder:text-ink-3";

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/**
 * タスク詳細（side-peek の中身）。自動保存（保存ボタンなし）。
 * 全変更は即 updateTask に反映され、「保存済み ✓」を一瞬表示する。
 */
export function TaskDetailPanel({ taskId }: { taskId: string }) {
  const { tasks, categories, updateTask, deleteTask } = useAppData();
  const { close } = useOverlay();
  const task = tasks.find((t) => t.id === taskId);

  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashSaved = () => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 900);
  };
  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );

  if (!task) return null;

  const patch = (p: Parameters<typeof updateTask>[1]) => {
    updateTask(task.id, p);
    flashSaved();
  };

  const setLink = (index: number, key: keyof TaskLink, value: string) => {
    const links = task.links.map((l, i) => (i === index ? { ...l, [key]: value } : l));
    patch({ links });
  };
  const addLink = () => patch({ links: [...task.links, { title: "", url: "" }] });
  const removeLink = (index: number) => patch({ links: task.links.filter((_, i) => i !== index) });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[11px] tracking-[0.04em] text-ink-3">タスク詳細</span>
        <div className="flex items-center gap-3">
          <span
            className={`text-[11px] text-primary transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}
          >
            保存済み ✓
          </span>
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="text-ink-3 transition-colors hover:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-4 overflow-auto">
        {/* タイトル */}
        <input
          value={task.title}
          onChange={(e) => patch({ title: e.target.value })}
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
      </div>

      {/* フッタ: メタ情報 + 削除 */}
      <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
        <span className="text-[11px] text-ink-3">
          作成 {fmtDateTime(task.createdAt)} ・ 更新 {fmtDateTime(task.updatedAt)}
        </span>
        <button
          type="button"
          onClick={() => {
            deleteTask(task.id);
            close();
          }}
          className="inline-flex items-center gap-1 text-[13px] text-crit transition-colors hover:underline"
        >
          <Trash2 className="size-3.5" /> 削除
        </button>
      </div>
    </div>
  );
}
