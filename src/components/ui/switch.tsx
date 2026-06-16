import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * ラベル付きの ON/OFF トグルスイッチ。
 * ボタンの押下色での状態表現より、つまみの位置で状態が一目で分かる直感操作を狙う部品。
 * `role="switch"` + `aria-checked` でスクリーンリーダーにも状態を伝える。
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** スイッチ右に並べるテキスト（省略可） */
  label?: React.ReactNode;
}) {
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-4 rounded-full bg-card shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        )}
      />
    </button>
  );

  if (label === undefined) return toggle;

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 select-none">
      {toggle}
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </label>
  );
}
