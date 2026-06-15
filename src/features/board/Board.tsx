import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Layout, Plus } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import type { Category, Task, TaskStatus } from "@/lib/types";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/types";
import { Lane } from "@/features/board/Lane";
import { DueChip } from "@/features/board/TaskCard";
import { parseCellId } from "@/features/board/BoardCell";
import { Button } from "@/components/ui/button";
import { AnchoredPopover } from "@/components/overlay/AnchoredPopover";
import { QuickAddForm } from "@/features/tasks/QuickAddForm";

const UNCAT_KEY = "uncat";
const UNCAT_COLOR = "#9aa29f"; // cat-mibun
const CAT_FALLBACK = ["#6b7c93", "#8a6d3b", "#7a5c8e", "#3f7e72", "#9a6b6b", "#6b8a7a"];

function catColor(c: Category, index: number): string {
  return c.color ?? CAT_FALLBACK[index % CAT_FALLBACK.length];
}

export function Board() {
  const { categories, tasks, moveTask } = useAppData();
  const { active, openTaskAdd, close } = useOverlay();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

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
    if (!e.over) return;
    const { categoryKey, status } = parseCellId(String(e.over.id));
    const categoryId = categoryKey === UNCAT_KEY ? null : categoryKey;
    moveTask(String(e.active.id), categoryId, status as TaskStatus);
  };

  const uncategorized = tasks.filter((t) => t.categoryId === null);
  const activeTask: Task | undefined = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Layout className="size-4 text-muted-foreground" />
          タスクボード
        </span>
        <AnchoredPopover
          open={active.kind === "taskAdd"}
          onOpenChange={(o) => (o ? openTaskAdd() : close())}
          title="タスクを追加（未分類）"
          trigger={
            <Button variant="outline" size="sm">
              <Plus />
              タスク
            </Button>
          }
        >
          <QuickAddForm />
        </AnchoredPopover>
      </div>

      {/* 状態見出し（3 列） */}
      <div className="grid grid-cols-3 gap-2.5 px-4 pt-3 pb-1 text-[11px] font-medium tracking-[0.05em] text-muted-foreground">
        {STATUS_ORDER.map((s) => (
          <span key={s} className={s === "done" ? "text-ink-3" : undefined}>
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto pb-2">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* 未分類レーン（常に先頭・控えめ） */}
          <Lane
            categoryKey={UNCAT_KEY}
            name="未分類"
            color={UNCAT_COLOR}
            tasks={uncategorized}
            collapsed={collapsed.has(UNCAT_KEY)}
            onToggle={() => toggle(UNCAT_KEY)}
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
            />
          ))}

          <DragOverlay>
            {activeTask ? (
              <div className="flex w-full cursor-grabbing flex-col gap-1.5 rounded-md border border-input bg-card p-2.5 text-left shadow-lg">
                <span className="text-[13px] leading-snug">{activeTask.title}</span>
                {activeTask.dueDate ? <DueChip dueDate={activeTask.dueDate} /> : null}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </section>
  );
}
