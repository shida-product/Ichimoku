import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import type { ShiftType } from "@/lib/types";
import { AnchoredPopover } from "@/components/overlay/AnchoredPopover";
import { shiftColor } from "@/features/shifts/shiftColors";
import { cn } from "@/lib/utils";

/**
 * その日のシフト（勤務地）を表す色付きチップ＋選択ポップオーバー。
 * クリックでマスタ（shiftTypes）から選択、または解除。予定とは別概念の日次ラベル。
 */
export function ShiftChip({
  shiftTypes,
  currentId,
  onSelect,
  onManage,
}: {
  shiftTypes: ShiftType[];
  /** その日に割り当て済みのシフト種別 id（未割当なら null） */
  currentId: string | null;
  onSelect: (shiftTypeId: string | null) => void;
  /** 勤務地マスタ管理を開く */
  onManage: () => void;
}) {
  const [open, setOpen] = useState(false);
  const current = currentId ? shiftTypes.find((s) => s.id === currentId) : undefined;
  const currentIdx = current ? shiftTypes.findIndex((s) => s.id === current.id) : -1;

  const pick = (id: string | null) => {
    onSelect(id);
    setOpen(false);
  };

  const trigger = current ? (
    <button
      type="button"
      title="シフトを変更"
      className="inline-flex max-w-[7.5rem] cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        borderColor: `${shiftColor(current, currentIdx)}66`,
        backgroundColor: `${shiftColor(current, currentIdx)}1f`,
      }}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: shiftColor(current, currentIdx) }}
      />
      <span className="truncate">{current.name}</span>
    </button>
  ) : (
    <button
      type="button"
      title="シフトを設定"
      className="inline-flex cursor-pointer items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-ink-3 transition-colors hover:border-input hover:text-muted-foreground"
    >
      <Plus className="size-3" />
      シフト
    </button>
  );

  return (
    <AnchoredPopover open={open} onOpenChange={setOpen} trigger={trigger} title="勤務地・シフト">
      <div className="flex flex-col gap-0.5">
        {shiftTypes.length === 0 ? (
          <p className="px-1 py-2 text-[12px] text-ink-3">
            勤務地が未登録です。下の「管理」から追加してください。
          </p>
        ) : (
          shiftTypes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent",
                s.id === currentId && "bg-secondary font-medium"
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: shiftColor(s, i) }}
              />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              {s.id === currentId ? <span className="text-[11px] text-primary">選択中</span> : null}
            </button>
          ))
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <button
          type="button"
          onClick={() => pick(null)}
          disabled={!currentId}
          className="cursor-pointer rounded px-1.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-40"
        >
          解除
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onManage();
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Settings className="size-3.5" />
          管理
        </button>
      </div>
    </AnchoredPopover>
  );
}
