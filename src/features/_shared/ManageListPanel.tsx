import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoInput, PanelShell, fieldClass } from "@/features/_shared/panel";
import { ColorPicker } from "@/features/_shared/ColorPicker";

export interface ManageListItem {
  id: string;
  name: string;
  color: string | null;
}

interface ManageListPanelProps<T extends ManageListItem> {
  label: string;
  addPlaceholder: string;
  emptyMessage: string;
  footer: ReactNode;
  items: T[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  onClose: () => void;
}

/**
 * カテゴリ・勤務地など、同じ操作体系のマスタ管理パネル。
 * 追加 / リネーム / 色選択 / 並べ替え / 削除の見た目と実装をここに集約する。
 */
export function ManageListPanel<T extends ManageListItem>({
  label,
  addPlaceholder,
  emptyMessage,
  footer,
  items,
  onAdd,
  onRename,
  onColorChange,
  onDelete,
  onReorder,
  onClose,
}: ManageListPanelProps<T>) {
  const [newName, setNewName] = useState("");

  const add = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewName("");
  };

  return (
    <PanelShell label={label} onClose={onClose} footer={footer}>
      <div className="flex items-center gap-1.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && add()}
          placeholder={addPlaceholder}
          className={fieldClass}
        />
        <Button type="button" size="icon-lg" onClick={add} aria-label={`${label}を追加`}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-1.5"
            >
              <div className="flex items-center gap-1.5">
                <AutoInput
                  value={item.name}
                  onValueChange={(v) => onRename(item.id, v)}
                  className="min-w-0 flex-1 bg-transparent px-1 py-1 text-[13px] outline-none focus:bg-secondary"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="上へ"
                  disabled={index === 0}
                  onClick={() => onReorder(item.id, "up")}
                  className="text-ink-3 hover:text-foreground"
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="下へ"
                  disabled={index === items.length - 1}
                  onClick={() => onReorder(item.id, "down")}
                  className="text-ink-3 hover:text-foreground"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="削除"
                  onClick={() => onDelete(item.id)}
                  className="text-ink-3 hover:text-crit"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="pl-1">
                <ColorPicker value={item.color} onChange={(v) => onColorChange(item.id, v)} />
              </div>
            </div>
          ))
        )}
      </div>
    </PanelShell>
  );
}
