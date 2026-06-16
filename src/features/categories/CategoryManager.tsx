import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { AutoInput, PanelShell, fieldClass } from "@/features/_shared/panel";
import { ColorPicker } from "@/features/_shared/ColorPicker";

/** カテゴリ管理（side-peek・共通枠）。作成・リネーム・並べ替え・削除。 */
export function CategoryManager({ onClose }: { onClose: () => void }) {
  const {
    categories,
    tasks,
    addCategory,
    renameCategory,
    deleteCategory,
    reorderCategory,
    setCategoryColor,
  } = useAppData();
  const [newName, setNewName] = useState("");

  const add = () => {
    if (!newName.trim()) return;
    addCategory(newName);
    setNewName("");
  };

  const countOf = (id: string) => tasks.filter((t) => t.categoryId === id).length;

  const footer = (
    <p className="text-[11px] text-ink-3">
      削除したカテゴリのタスクは「未分類」へ移動します（破棄されません）。
    </p>
  );

  return (
    <PanelShell label="カテゴリ管理" onClose={onClose} footer={footer}>
      {/* 追加 */}
      <div className="flex items-center gap-1.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && add()}
          placeholder="新しいカテゴリ名"
          className={fieldClass}
        />
        <button
          type="button"
          onClick={add}
          aria-label="カテゴリを追加"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/85"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* 一覧 */}
      <div className="flex flex-col gap-1.5">
        {categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            カテゴリがありません。上から追加できます。
          </p>
        ) : (
          categories.map((c, i) => (
            <div
              key={c.id}
              className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-1.5"
            >
              <div className="flex items-center gap-1.5">
                <AutoInput
                  value={c.name}
                  onValueChange={(v) => renameCategory(c.id, v)}
                  className="min-w-0 flex-1 bg-transparent px-1 py-1 text-[13px] outline-none focus:bg-secondary"
                />
                <span className="shrink-0 px-1 text-[11px] text-ink-3">{countOf(c.id)}</span>
                <button
                  type="button"
                  aria-label="上へ"
                  disabled={i === 0}
                  onClick={() => reorderCategory(c.id, "up")}
                  className="rounded p-1 text-ink-3 transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="下へ"
                  disabled={i === categories.length - 1}
                  onClick={() => reorderCategory(c.id, "down")}
                  className="rounded p-1 text-ink-3 transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="削除"
                  onClick={() => deleteCategory(c.id)}
                  className="rounded p-1 text-ink-3 transition-colors hover:bg-secondary hover:text-crit"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="pl-1">
                <ColorPicker value={c.color} onChange={(v) => setCategoryColor(c.id, v)} />
              </div>
            </div>
          ))
        )}
      </div>
    </PanelShell>
  );
}
