import { Check } from "lucide-react";
import { CAT_SLOTS, slotVar } from "@/lib/palette";
import { cn } from "@/lib/utils";

/**
 * 分類色ピッカー（カテゴリ・勤務地で共通）。
 * テーマパレットの 6 スロット＋「自動」から選ぶだけ。自由 hex は扱わない
 * （色値は index.css に一元管理し、テーマ追従・コントラスト破綻なしを担保）。
 *
 * value: null=自動 / "cat-1".."cat-6"=固定スロット
 */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        title="自動（テーマ追従）"
        className={cn(
          "flex h-5 items-center rounded-full border px-2 text-[10px] leading-none transition-colors",
          value === null
            ? "border-foreground/40 bg-secondary text-foreground"
            : "border-border text-ink-3 hover:text-muted-foreground"
        )}
      >
        自動
      </button>
      {CAT_SLOTS.map((slot) => {
        const selected = value === slot;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => onChange(slot)}
            title={`分類色 ${slot.replace("cat-", "")}`}
            aria-label={`分類色 ${slot.replace("cat-", "")}${selected ? "（選択中）" : ""}`}
            className={cn(
              "flex size-5 items-center justify-center rounded-full ring-offset-1 ring-offset-card transition-shadow",
              selected ? "ring-2 ring-foreground/50" : "hover:ring-2 hover:ring-border"
            )}
            style={{ background: slotVar(slot) }}
          >
            {selected ? <Check className="size-3 text-white" /> : null}
          </button>
        );
      })}
    </div>
  );
}
