import { Dialog } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * SidePeek — 右からのスライドオーバー（§3.7 の「中」オーバーレイ）。
 *
 * 純粋なコンテナに徹する: オーバーレイ機構（スライド・Esc/外クリックで閉じる・
 * フォーカストラップ・a11y タイトル）だけを担い、ヘッダ/フッタ/閉じるボタンは
 * 中身（各パネル）側が描画する（保存フラッシュ等をパネルが持つため）。
 *
 * 操作モデルの規律: ベース画面を覆い隠さず重ねる／クリック外・Esc で即閉じる／
 * 「保存しますか？」を出さない（自動保存前提）／同時に開くのは常に 1 枚。
 */
interface SidePeekProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** スクリーンリーダ用のタイトル（視覚的には各パネルが見出しを描画） */
  label: string;
  children: React.ReactNode;
}

export function SidePeek({ open, onOpenChange, label, children }: SidePeekProps) {
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
            "fixed inset-y-0 right-0 z-50 flex w-[380px] max-w-full flex-col p-[18px]",
            "border-l border-input bg-card shadow-[-8px_0_24px_rgba(20,30,28,0.06)] outline-none",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
          )}
        >
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
