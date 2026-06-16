import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * side-peek 詳細パネルの共通 UI 部品。
 * タスク・予定の追加/編集はすべてこの枠を共有し、見た目と操作（自動保存・閉じる）を統一する。
 */

/** 入力系の共通クラス */
export const fieldClass =
  "w-full rounded-md border border-input bg-card px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25 placeholder:text-ink-3";

/**
 * 自動保存テキスト入力を IME（日本語変換）セーフにする共通フック。
 *
 * 問題: 自動保存は onChange ごとにストア更新 → 再レンダーする。変換確定前に
 * value が外から差し替わると IME の変換が中断され「途中で確定」してしまう。
 *
 * 対策:
 * - 表示値は**ローカル state** で持ち、再レンダーで打鍵中の文字が消えないようにする。
 * - compositionstart〜end の間はストアへ伝播しない（確定時にまとめて伝播）。
 * - 入力にフォーカス中・変換中は外部 value での上書きを抑止する。
 */
function useAutoField(value: string, onValueChange: (v: string) => void) {
  const [local, setLocal] = useState(value);
  const composing = useRef(false);
  const focused = useRef(false);

  // 外部からの値変更（別レコードを開いた等）は、入力中・変換中でなければ反映。
  useEffect(() => {
    if (!focused.current && !composing.current) setLocal(value);
  }, [value]);

  return {
    value: local,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setLocal(e.target.value);
      if (!composing.current) onValueChange(e.target.value);
    },
    onCompositionStart: () => {
      composing.current = true;
    },
    onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      composing.current = false;
      onValueChange(e.currentTarget.value);
    },
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;
    },
  };
}

/**
 * IME セーフな自動保存テキスト入力。見た目は呼び出し側の className に委ねる
 * （タイトルの下線・フィールド枠など用途で異なるため。共通枠が要るなら `fieldClass` を渡す）。
 */
export function AutoInput({
  value,
  onValueChange,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (v: string) => void;
}) {
  const field = useAutoField(value, onValueChange);
  return <input {...props} {...field} className={className} />;
}

/**
 * 内容の文字数・行数に合わせて高さが自動で伸縮する textarea（IME セーフ）。
 * 入力時はもちろん、value 変更（パネルを閉じて開き直した際の初期表示）でも再計算する。
 * 共通の `fieldClass` を踏襲しつつ、縦の手動リサイズは無効化（自動制御に統一）。
 */
export function AutoTextarea({
  value,
  onValueChange,
  className,
  ...props
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const field = useAutoField(value, onValueChange);

  // レイアウト確定前に高さを合わせ、初回表示のちらつきを防ぐ。表示値（field.value）に追従。
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [field.value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      {...props}
      {...field}
      className={`${fieldClass} resize-none overflow-hidden ${className ?? ""}`}
    />
  );
}

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
