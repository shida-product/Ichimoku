import { useEffect, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Layout, Plus, StickyNote } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import type { Category, Task } from "@/lib/types";
import { Lane } from "@/features/board/Lane";
import { DueChip } from "@/features/board/TaskCard";
import { parseCellId } from "@/features/board/BoardCell";
import { CompleteZone, DONE_ZONE_ID } from "@/features/board/CompleteZone";
import { UndoToast } from "@/features/board/UndoToast";
import { Button } from "@/components/ui/button";

const UNCAT_KEY = "uncat";
const UNCAT_COLOR = "#9aa29f"; // cat-mibun
const CAT_FALLBACK = ["#6b7c93", "#8a6d3b", "#7a5c8e", "#3f7e72", "#9a6b6b", "#6b8a7a"];

/** 完了トーストの表示時間（ミリ秒） */
const TOAST_MS = 5000;

function catColor(c: Category, index: number): string {
  return c.color ?? CAT_FALLBACK[index % CAT_FALLBACK.length];
}

export function Board() {
  const { categories, tasks, archivedTasks, reorderTask, completeTask, uncompleteTask, addTask } =
    useAppData();
  const { openTaskDraft, openHistory } = useOverlay();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMemo, setShowMemo] = useState(true);
  const [quick, setQuick] = useState("");
  const [toast, setToast] = useState<{ id: string; title: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (toastTimer.current && clearTimeout(toastTimer.current)), []);

  const flashToast = (task: Task) => {
    setToast({ id: task.id, title: task.title });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };
  const dismissToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  const submitQuick = () => {
    const title = quick.trim();
    if (!title) return;
    addTask({ title });
    setQuick("");
  };

  const sensors = useSensors(
    // 5px 動かすまではドラッグ開始しない＝カードのクリック（詳細を開く）と両立
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    // 完了ドロップゾーン: 即アーカイブで消化。誤ドロップ救済の undo トーストを出す。
    if (overId === DONE_ZONE_ID) {
      const t = tasks.find((x) => x.id === activeId);
      if (!t) return;
      completeTask(activeId);
      flashToast(t);
      return;
    }

    let categoryKey: string;
    let beforeId: string | null;

    if (overId.includes("__")) {
      // カテゴリのリスト領域（空セル含む）にドロップ → そのカテゴリの末尾へ
      categoryKey = parseCellId(overId).categoryKey;
      beforeId = null;
    } else {
      // 別カードにドロップ → そのカードと同じカテゴリの、そのカードの直前へ挿入
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      categoryKey = overTask.categoryId ?? UNCAT_KEY;
      beforeId = overId;
    }
    const categoryId = categoryKey === UNCAT_KEY ? null : categoryKey;
    reorderTask(activeId, categoryId, beforeId);
  };

  const uncategorized = tasks.filter((t) => t.categoryId === null);
  const activeTask: Task | undefined = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  return (
    <section className="relative flex min-h-0 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-display text-[15px] font-bold">
          <Layout className="size-4 text-muted-foreground" />
          タスクボード
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant={showMemo ? "secondary" : "outline"}
            size="sm"
            aria-pressed={showMemo}
            onClick={() => setShowMemo((v) => !v)}
            title="カード上のメモ表示を切り替え"
          >
            <StickyNote />
            メモ
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = addTask({ title: "" });
              openTaskDraft(id);
            }}
          >
            <Plus />
            タスク
          </Button>
        </div>
      </div>

      {/* パッと追加（常時表示・Enter で未分類に即タスク化 §3.3.1） */}
      <div className="border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 rounded-md border border-input bg-card px-2.5 focus-within:border-ring">
          <Plus className="size-3.5 shrink-0 text-ink-3" />
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitQuick()}
            placeholder="タスクをパッと追加（Enter）— 未分類へ"
            className="flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-ink-3"
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-0 flex-1 overflow-auto pt-1 pb-2">
          {/* 未分類レーン（常に先頭・控えめ） */}
          <Lane
            categoryKey={UNCAT_KEY}
            name="未分類"
            color={UNCAT_COLOR}
            tasks={uncategorized}
            collapsed={collapsed.has(UNCAT_KEY)}
            onToggle={() => toggle(UNCAT_KEY)}
            showMemo={showMemo}
            muted
          />

          {categories.map((c, i) => (
            <Lane
              key={c.id}
              categoryKey={c.id}
              name={c.name}
              color={catColor(c, i)}
              tasks={tasks.filter((t) => t.categoryId === c.id)}
              collapsed={collapsed.has(c.id)}
              onToggle={() => toggle(c.id)}
              showMemo={showMemo}
            />
          ))}
        </div>

        {/* 共有の完了ドロップゾーン（ボード下部に固定） */}
        <CompleteZone totalCount={archivedTasks.length} onOpenHistory={openHistory} />

        <DragOverlay>
          {activeTask ? (
            <div className="flex w-full cursor-grabbing flex-col gap-1.5 rounded-md border border-input bg-card p-2.5 text-left shadow-lg">
              <span className="text-[13px] leading-snug">{activeTask.title}</span>
              {activeTask.dueDate ? <DueChip dueDate={activeTask.dueDate} /> : null}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {toast ? (
        <UndoToast
          title={toast.title}
          onUndo={() => {
            uncompleteTask(toast.id);
            dismissToast();
          }}
          onDismiss={dismissToast}
        />
      ) : null}
    </section>
  );
}
