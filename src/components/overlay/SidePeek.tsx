import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SidePeek — 右からのスライドオーバー（§3.7 の「中」オーバーレイ）。
 *
 * 操作モデルの規律（prototype-overlay.html が正本）:
 *  - ベース画面を覆い隠さず、右に重ねて編集する（中央モーダルは封印）。
 *  - クリック外／Esc で即閉じる（「保存しますか？」は出さない）。
 *  - 保存ボタンは置かない＝中身側で自動保存する前提。
 *  - 同時に開くオーバーレイは常に 1 枚（open 状態は呼び出し側で一元管理する）。
 */
interface SidePeekProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** パネル上部の小ラベル（例: タスク詳細 / カテゴリ管理） */
  label?: string;
  children: React.ReactNode;
  /** 下部に固定する操作領域（削除ボタン・メタ情報など。任意） */
  footer?: React.ReactNode;
}

export function SidePeek({ open, onOpenChange, label, children, footer }: SidePeekProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-foreground/15",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-[380px] max-w-full flex-col",
            "border-l border-input bg-card shadow-[-8px_0_24px_rgba(20,30,28,0.06)] outline-none",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
          )}
        >
          <Dialog.Title className="sr-only">{label ?? "詳細パネル"}</Dialog.Title>
          <div className="flex items-center justify-between px-[18px] pt-[18px]">
            <span className="text-[11px] tracking-[0.04em] text-ink-3">{label}</span>
            <Dialog.Close
              aria-label="閉じる"
              className="rounded-sm text-ink-3 transition-colors hover:text-foreground"
            >
              <X className="size-[18px]" />
            </Dialog.Close>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-auto px-[18px] pt-3 pb-[18px]">
            {children}
          </div>

          {footer ? <div className="border-t border-border px-[18px] py-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
