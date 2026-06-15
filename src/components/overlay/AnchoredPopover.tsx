import { Popover } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * AnchoredPopover — 要素に紐づく小パネル（§3.7 の「軽」オーバーレイ）。
 *
 * 用途: クイック追加・＋予定・日付選択・カテゴリ/状態の選択 など。
 * 規律: トリガー要素にアンカーし、クリック外／Esc で即閉じる。中央モーダルにしない。
 *       同時に開くオーバーレイは常に 1 枚（open は呼び出し側で一元管理）。
 */
interface AnchoredPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** アンカーとなるトリガー要素（Button 等） */
  trigger: React.ReactNode;
  children: React.ReactNode;
  /** パネル上部の見出し（任意） */
  title?: string;
  align?: "start" | "center" | "end";
  className?: string;
}

export function AnchoredPopover({
  open,
  onOpenChange,
  trigger,
  children,
  title,
  align = "end",
  className,
}: AnchoredPopoverProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          className={cn(
            "z-50 w-60 rounded-md border border-input bg-popover p-3 text-popover-foreground",
            "shadow-[0_8px_24px_rgba(20,30,28,0.12)] outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className
          )}
        >
          {title ? <p className="mb-2 text-xs text-muted-foreground">{title}</p> : null}
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
