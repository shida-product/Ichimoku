import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { AutoInput, PanelShell, fieldClass } from "@/features/_shared/panel";
import { shiftColor } from "@/features/shifts/shiftColors";
import { CAT_PALETTE_VARS, toHex } from "@/lib/palette";

/** 勤務地（シフト種別）管理。作成・リネーム・色変更・並べ替え・削除。カテゴリ管理と同型。 */
export function ShiftManager({ onClose }: { onClose: () => void }) {
  const { shiftTypes, shifts, addShiftType, updateShiftType, deleteShiftType, reorderShiftType } =
    useAppData();
  const [newName, setNewName] = useState("");

  const add = () => {
    if (!newName.trim()) return;
    addShiftType(newName);
    setNewName("");
  };

  const countOf = (id: string) => shifts.filter((s) => s.shiftTypeId === id).length;

  const footer = (
    <p className="text-[11px] text-ink-3">
      削除すると、その勤務地が割り当てられていた日のシフトも外れます。
    </p>
  );

  return (
    <PanelShell label="勤務地管理" onClose={onClose} footer={footer}>
      {/* 追加 */}
      <div className="flex items-center gap-1.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && add()}
          placeholder="新しい勤務地・シフト名（例: 渋谷店 / 休み）"
          className={fieldClass}
        />
        <button
          type="button"
          onClick={add}
          aria-label="勤務地を追加"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/85"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* 一覧 */}
      <div className="flex flex-col gap-1.5">
        {shiftTypes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            勤務地がありません。上から追加できます。
          </p>
        ) : (
          shiftTypes.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card p-1.5"
            >
              <label
                className="relative ml-1 size-3.5 shrink-0 cursor-pointer rounded-[3px]"
                style={{ background: shiftColor(s, i) }}
                title="色を変更"
              >
                <input
                  type="color"
                  value={toHex(shiftColor(s, i))}
                  onChange={(e) => updateShiftType(s.id, { color: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label={`${s.name} の色`}
                />
              </label>
              <AutoInput
                value={s.name}
                onValueChange={(v) => updateShiftType(s.id, { name: v })}
                className="min-w-0 flex-1 bg-transparent px-1 py-1 text-[13px] outline-none focus:bg-secondary"
              />
              <span className="shrink-0 px-1 text-[11px] text-ink-3" title="割当日数">
                {countOf(s.id)}
              </span>
              <button
                type="button"
                aria-label="上へ"
                disabled={i === 0}
                onClick={() => reorderShiftType(s.id, "up")}
                className="rounded p-1 text-ink-3 transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="下へ"
                disabled={i === shiftTypes.length - 1}
                onClick={() => reorderShiftType(s.id, "down")}
                className="rounded p-1 text-ink-3 transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="削除"
                onClick={() => deleteShiftType(s.id)}
                className="rounded p-1 text-ink-3 transition-colors hover:bg-secondary hover:text-crit"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 色サンプル（選びやすさのための補助・任意） */}
      <div className="flex flex-wrap gap-1.5">
        <span className="w-full text-[11px] text-muted-foreground">標準色</span>
        {CAT_PALETTE_VARS.map((c) => (
          <span key={c} className="size-4 rounded" style={{ background: c }} title={c} />
        ))}
      </div>
    </PanelShell>
  );
}
