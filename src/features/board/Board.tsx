import { Fragment, useState } from "react";
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
import type { Category, Task, TaskStatus } from "@/lib/types";
import { STATUS_LABEL, WORKING_STATUSES } from "@/lib/types";
import { Lane } from "@/features/board/Lane";
import { DueChip } from "@/features/board/TaskCard";
import { parseCellId } from "@/features/board/BoardCell";
import { CompleteZone, DONE_ZONE_ID } from "@/features/board/CompleteZone";
import { Button } from "@/components/ui/button";

const UNCAT_KEY = "uncat";
const UNCAT_COLOR = "#9aa29f"; // cat-mibun
const CAT_FALLBACK = ["#6b7c93", "#8a6d3b", "#7a5c8e", "#3f7e72", "#9a6b6b", "#6b8a7a"];

function catColor(c: Category, index: number): string {
  return c.color ?? CAT_FALLBACK[index % CAT_FALLBACK.length];
}

export function Board() {
  const { categories, tasks, reorderTask, moveTask, addTask } = useAppData();
  const { openTask, openTaskDraft } = useOverlay();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMemo, setShowMemo] = useState(true);
  const [quick, setQuick] = useState("");

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

    // 完了ドロップゾーン: カテゴリは保ったまま完了（status=done）にして消化する
    if (overId === DONE_ZONE_ID) {
      const t = tasks.find((x) => x.id === activeId);
      if (!t || t.status === "done") return;
      moveTask(activeId, t.categoryId, "done");
      return;
    }

    let categoryKey: string;
    let status: TaskStatus;
    let beforeId: string | null;

    if (overId.includes("__")) {
      // セルそのもの（空セル等）にドロップ → そのセルの末尾へ
      const parsed = parseCellId(overId);
      categoryKey = parsed.categoryKey;
      status = parsed.status as TaskStatus;
      beforeId = null;
    } else {
      // 別カードにドロップ → そのカードと同じセルの、そのカードの直前へ挿入
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      categoryKey = overTask.categoryId ?? UNCAT_KEY;
      status = overTask.status;
      beforeId = overId;
    }
    const categoryId = categoryKey === UNCAT_KEY ? null : categoryKey;
    reorderTask(activeId, categoryId, status, beforeId);
  };

  const uncategorized = tasks.filter((t) => t.categoryId === null);
  const doneTasks = tasks.filter((t) => t.status === "done");
  const activeTask: Task | undefined = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
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

      {/* パッと追加（常時表示・Enter で未分類/未着手に即タスク化 §3.3.1） */}
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

      {/* 状態見出し（2 列・列間に薄い縦罫線） */}
      <div className="grid grid-cols-[1fr_10px_1fr] px-4 pt-3 pb-1 text-[11px] font-medium tracking-[0.05em] text-muted-foreground">
        {WORKING_STATUSES.map((s, i) => (
          <Fragment key={s}>
            {i > 0 ? <div className="w-px justify-self-center self-stretch bg-border" /> : null}
            <span>{STATUS_LABEL[s]}</span>
          </Fragment>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-0 flex-1 overflow-auto pb-2">
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
        <CompleteZone
          doneTasks={doneTasks}
          onOpen={openTask}
          onUndo={(id) => {
            const t = tasks.find((x) => x.id === id);
            moveTask(id, t?.categoryId ?? null, "todo");
          }}
        />

        <DragOverlay>
          {activeTask ? (
            <div className="flex w-full cursor-grabbing flex-col gap-1.5 rounded-md border border-input bg-card p-2.5 text-left shadow-lg">
              <span className="text-[13px] leading-snug">{activeTask.title}</span>
              {activeTask.dueDate ? <DueChip dueDate={activeTask.dueDate} /> : null}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
