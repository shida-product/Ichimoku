import { useState, useRef, useEffect } from "react";
import { useAppData } from "@/store/AppDataContext";

export function TampermonkeyMockUI() {
  const { addTask } = useAppData();
  const [pos, setPos] = useState<{ side: "left" | "right"; topRatio: number }>({
    side: "right",
    topRatio: 0.5,
  });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const startY = useRef(0);
  const tabRef = useRef<HTMLDivElement>(null);

  // 外側クリックでパネルを閉じる処理
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!open) return;
      const path = e.composedPath ? e.composedPath() : [];
      if (
        panelRef.current &&
        !path.includes(panelRef.current) &&
        tabRef.current &&
        !path.includes(tabRef.current)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  // トースト自動非表示
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ドラッグ開始
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    setDragging(true);
    hasMoved.current = false;
    startY.current = e.clientY;
    if (tabRef.current) {
      tabRef.current.setPointerCapture(e.pointerId);
    }
  };

  // ドラッグ中
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const deltaY = Math.abs(e.clientY - startY.current);
    if (deltaY > 5) {
      hasMoved.current = true;
    }

    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // 高さの比率計算 (0.05〜0.95でクランプして画面端に隠れすぎないようにする)
    const rawRatio = e.clientY / vh;
    const topRatio = Math.max(0.05, Math.min(0.95, rawRatio));

    // 左右のどちらに近いかでサイドを決定
    const side = e.clientX < vw / 2 ? "left" : "right";

    setPos({ side, topRatio });
  };

  // ドラッグ終了
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    if (tabRef.current) {
      tabRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // クリック
  const handleClick = () => {
    if (hasMoved.current) return;
    setOpen((prev) => !prev);
  };

  // タスク追加送信
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      addTask({ title: trimmed });
      setTitle("");
      setOpen(false);
      setToast("タスクを追加しました ✓");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert("追加失敗: " + errMsg);
    }
  };

  // つまみの配置スタイル計算 (高さ: 64px)
  const tabTop = `calc(${pos.topRatio * 100}vh - 32px)`;

  // パネルの配置スタイル計算 (高さ: 約200px)
  const panelTop = `calc(${pos.topRatio * 100}vh - 100px)`;

  return (
    <>
      {/* ── つまみ (端タブ) ── */}
      <div
        ref={tabRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        style={{ top: tabTop }}
        className={`fixed w-[30px] h-[64px] bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center select-none touch-none shadow-md z-[9998] transition-all duration-150 ease-out cursor-grab active:cursor-grabbing hover:w-[36px] ${
          dragging
            ? "opacity-100 scale-105 shadow-[0_4px_12px_rgba(26,115,232,0.3)]"
            : "opacity-70 hover:opacity-100"
        } ${pos.side === "right" ? "right-0 rounded-l-lg" : "left-0 rounded-r-lg"}`}
        title="ドラッグで移動・左右スナップ / クリックで追加パネル"
      >
        <span className="text-[20px] font-bold leading-none select-none">＋</span>
      </div>

      {/* ── クイック追加パネル ── */}
      {open && (
        <div
          ref={panelRef}
          style={{ top: panelTop }}
          className={`fixed w-[300px] bg-card border border-border rounded-lg p-4 shadow-xl z-[9999] animate-in fade-in zoom-in-95 duration-150 ${
            pos.side === "right" ? "right-[40px]" : "left-[40px]"
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs text-primary font-bold m-0">＋ Ichimoku にタスクを追加 (デモ)</p>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-primary text-[11px] bg-none border-none p-0 cursor-pointer transition-colors"
            >
              閉じる
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="やることを入力…"
              className="w-full border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-md px-2.5 py-2 text-sm text-foreground bg-background outline-none transition-all placeholder:text-muted-foreground/60"
              autoFocus
            />
            <div className="flex justify-between items-center mt-2.5 text-xs text-muted-foreground">
              <span>
                <kbd className="bg-secondary border border-border rounded px-1.5 py-0.5 text-[10px] text-primary font-mono mr-1">
                  Enter
                </kbd>
                で追加
              </span>
              <span className="text-[10px] text-muted-foreground/80 italic">
                (拡張機能のデモ画面です)
              </span>
            </div>
          </form>
        </div>
      )}

      {/* ── トースト通知 ── */}
      {toast && (
        <div className="fixed left-1/2 bottom-[28px] -translate-x-1/2 bg-primary text-primary-foreground px-[18px] py-[10px] rounded-full text-xs shadow-md animate-in fade-in slide-in-from-bottom-5 duration-200 z-[9999]">
          {toast}
        </div>
      )}
    </>
  );
}
