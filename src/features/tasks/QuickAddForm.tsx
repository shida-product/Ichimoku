import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/store/AppDataContext";

/**
 * クイック追加（AnchoredPopover の中身）。未分類・未着手で即タスク化。
 * 連続キャプチャしやすいよう、追加後もポップは閉じず入力をクリアして再フォーカスする
 * （閉じるのは Esc / 外クリック）。
 */
export function QuickAddForm() {
  const { addTask } = useAppData();
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!title.trim()) return;
    addTask({ title });
    setTitle("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="タスク名（Enter で追加）"
        className="w-full rounded-md border border-input bg-card px-2 py-2 text-[13px] outline-none focus:border-ring placeholder:text-ink-3"
      />
      <Button size="sm" className="w-full" onClick={submit} disabled={!title.trim()}>
        追加（未分類）
      </Button>
    </div>
  );
}
