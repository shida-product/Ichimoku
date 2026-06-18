import { CircleCheckBig, ExternalLink, Plus, Star, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/store/AppDataContext";
import { isFlagged, type TaskLink } from "@/lib/types";
import { TIME_OPTIONS } from "@/lib/time";
import {
  AutoInput,
  AutoTextarea,
  PanelFooterRow,
  PanelShell,
  fieldClass,
  titleInputClass,
  useSavedFlash,
} from "@/features/_shared/panel";

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
  const { tasks, archivedTasks, categories, updateTask, completeTask, deleteTask, uncompleteTask } =
    useAppData();
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

  // 操作ボタン（完了・削除・未着手へ戻す）は入力項目の直下に置く。
  // 完了＝ドラッグでの完了ゾーン投入と同じ（即アーカイブ）。モーダルからも消化できるように。
  const actionRow = (
    <PanelFooterRow
      right={
        <>
          {done ? (
            // 完了タスク（完了履歴から開いた場合）は未着手へ戻せる
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                uncompleteTask(task.id);
                onClose();
              }}
            >
              <Undo2 className="size-3.5" /> 未着手へ戻す
            </Button>
          ) : (
            // 未完了タスクはここから完了（消化）できる
            <Button
              type="button"
              size="sm"
              onClick={() => {
                completeTask(task.id);
                onClose();
              }}
            >
              <CircleCheckBig className="size-3.5" /> 完了
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              deleteTask(task.id);
              onClose();
            }}
          >
            <Trash2 className="size-3.5" /> 削除
          </Button>
        </>
      }
    />
  );

  // 作成/更新時刻は補足情報として最下部に残す。
  const footer = (
    <span className="text-[11px] text-ink-3">
      作成 {fmtDateTime(task.createdAt)} ・ 更新 {fmtDateTime(task.updatedAt)}
    </span>
  );

  return (
    <PanelShell label="タスク" saved={saved} onClose={onClose} footer={footer}>
      {/* タイトル */}
      <AutoInput
        value={task.title}
        onValueChange={(v) => patch({ title: v })}
        autoFocus={task.title === ""}
        className={titleInputClass}
        placeholder="タイトル"
      />

      {/* メモ */}
      <label className="block">
        <span className="mb-1.5 block text-xs text-muted-foreground">メモ</span>
        <AutoTextarea
          value={task.description}
          onValueChange={(v) => patch({ description: v })}
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
                <AutoInput
                  value={link.title}
                  onValueChange={(v) => setLink(i, "title", v)}
                  placeholder="ラベル（任意）"
                  className={fieldClass}
                />
                <AutoInput
                  value={link.url}
                  onValueChange={(v) => setLink(i, "url", v)}
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
              patch({
                dueDate: e.target.checked ? (task.dueDate ?? "2026-06-20") : null,
                // 締切を外したら時刻も解除
                dueTime: e.target.checked ? task.dueTime : null,
              })
            }
            className="size-4 accent-primary"
          />
          締切を設定
        </label>
        {task.dueDate !== null && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="date"
              value={task.dueDate}
              onChange={(e) => patch({ dueDate: e.target.value || null })}
              className={`${fieldClass} flex-1`}
            />
            <select
              value={task.dueTime ?? ""}
              onChange={(e) => patch({ dueTime: e.target.value || null })}
              aria-label="締切時刻（任意・15分刻み）"
              title="締切時刻（任意）"
              className={`${fieldClass} w-28`}
            >
              <option value="">時刻なし</option>
              {TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
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

      {/* 操作（削除・未着手へ戻す）は入力項目の直下に置く */}
      <div className="border-t border-border pt-3">{actionRow}</div>
    </PanelShell>
  );
}
