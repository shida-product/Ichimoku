import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * side-peek 詳細パネルの共通 UI 部品。
 * タスク・予定の追加/編集はすべてこの枠を共有し、見た目と操作（自動保存・閉じる）を統一する。
 */

/** 入力系の共通クラス */
export const fieldClass =
  "w-full rounded-md border border-input bg-card px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25 placeholder:text-ink-3";

/** 自動保存の「保存済み ✓」点滅フラグ */
export function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = () => {
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 900);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  return { saved, flash };
}

/** 詳細パネルの共通枠（ヘッダ＝ラベル＋保存表示＋閉じる ／ 本体 ／ 任意フッタ） */
export function PanelShell({
  label,
  saved,
  onClose,
  children,
  footer,
}: {
  label: string;
  /** 自動保存対象パネルのみ渡す（カテゴリ管理などでは省略） */
  saved?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[11px] tracking-[0.04em] text-ink-3">{label}</span>
        <div className="flex items-center gap-3">
          {saved !== undefined ? (
            <span
              className={`text-[11px] text-primary transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}
            >
              保存済み ✓
            </span>
          ) : null}
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="text-ink-3 transition-colors hover:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-4 overflow-auto">{children}</div>

      {footer ? <div className="mt-2 border-t border-border pt-3">{footer}</div> : null}
    </div>
  );
}
