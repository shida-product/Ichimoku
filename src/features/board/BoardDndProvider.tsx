import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useAppData } from "@/store/AppDataContext";
import type { Task } from "@/lib/types";
import { DueChip } from "@/features/board/TaskCard";
import { parseCellId } from "@/features/board/BoardCell";
import { DONE_ZONE_ID } from "@/features/board/CompleteZone";
import { UndoToast } from "@/features/board/UndoToast";

const UNCAT_KEY = "uncat";

/** 完了トーストの表示時間（ミリ秒） */
const TOAST_MS = 5000;

/**
 * 近日締切レーンのドラッグ用 id 接頭辞。
 * 同一タスクがボード（カード id = task.id）と締切レーンの両方に出るため、
 * dnd-kit 上で id が衝突しないよう締切側にだけ付ける。
 */
export const DEADLINE_PREFIX = "deadline:";

/** カテゴリ列（カンバンのカラム）のドラッグ用 id 接頭辞。タスク id と区別する。 */
export const CATEGORY_PREFIX = "category:";

/**
 * 衝突判定: まずカーソルが直接重なる droppable（pointerWithin）を優先する。
 * これにより未分類が空のときの薄いゾーンや完了ゾーンなど、的が小さくても
 * 「カーソルがある場所」に確実にドロップできる。重なりが無ければ矩形交差→
 * 最近傍コーナーへフォールバックし、列の隙間でも破綻しない。
 */
const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) return pointer;
  const rect = rectIntersection(args);
  if (rect.length > 0) return rect;
  return closestCorners(args);
};

/** カテゴリキー（"uncat" or categoryId）→ タスク id 配列 */
type Containers = Record<string, string[]>;

const cloneContainers = (c: Containers): Containers =>
  Object.fromEntries(Object.entries(c).map(([k, v]) => [k, [...v]]));

// ── ボードの並び順を配るコンテキスト ──────────────────────────────
// ドラッグ中は override（ライブの並び）を、非ドラッグ時は tasks 由来の base を返す。
type BoardOrderCtx = { orderedTasks: (containerKey: string) => Task[] };
const OrderCtx = createContext<BoardOrderCtx | null>(null);

export function useBoardOrder(): BoardOrderCtx {
  const ctx = useContext(OrderCtx);
  if (!ctx) throw new Error("useBoardOrder は BoardDndProvider 内で使ってください");
  return ctx;
}

/**
 * ボード・近日締切レーンをまたぐ単一の DndContext。
 *
 * 並べ替えは dnd-kit の multiple-containers 方式（列間ライブ移動）で実装する。
 * - onDragOver: 別カテゴリ列へ入った瞬間に override（ライブ並び）へ反映＝他カードがよける。
 * - onDragEnd:  最終並びを fractional index（`reorderTask` の beforeId 挿入）で永続化。
 * - tasks 反映後に override を破棄して真実値へ追従（戻りフラッシュなし）。
 */
export function BoardDndProvider({ children }: { children: React.ReactNode }) {
  const { tasks, categories, reorderTask, moveCategoryBefore, completeTask, uncompleteTask } =
    useAppData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [override, setOverride] = useState<Containers | null>(null);
  const draggingRef = useRef(false);
  const [toast, setToast] = useState<{ id: string; title: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (toastTimer.current && clearTimeout(toastTimer.current)), []);

  // 楽観更新（reorder/complete）で tasks が変わったら override を破棄し真実値へ追従。
  // ドラッグ中は触らない（外部更新でライブ並びを壊さない）。
  useEffect(() => {
    if (!draggingRef.current) setOverride(null);
  }, [tasks]);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t] as const)), [tasks]);

  // position 昇順でカテゴリ列ごとにバケツ分け（空カテゴリ列も保持）。
  const base = useMemo<Containers>(() => {
    const map: Containers = { [UNCAT_KEY]: [] };
    for (const c of categories) map[c.id] = [];
    const sorted = [...tasks].sort((a, b) =>
      a.position < b.position ? -1 : a.position > b.position ? 1 : 0
    );
    for (const t of sorted) {
      const key = t.categoryId ?? UNCAT_KEY;
      (map[key] ??= []).push(t.id);
    }
    return map;
  }, [tasks, categories]);

  const containers = override ?? base;

  const orderedTasks = useCallback(
    (key: string): Task[] =>
      (containers[key] ?? []).map((id) => byId.get(id)).filter((t): t is Task => Boolean(t)),
    [containers, byId]
  );

  const findContainer = (id: string): string | null => {
    if (id === DONE_ZONE_ID) return null;
    if (id.includes("__")) return parseCellId(id).categoryKey; // 空セル（カテゴリ領域）にホバー
    if (id in containers) return id;
    for (const [key, ids] of Object.entries(containers)) if (ids.includes(id)) return key;
    return null;
  };

  const flashToast = (task: Task) => {
    setToast({ id: task.id, title: task.title });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };
  const dismissToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  const sensors = useSensors(
    // 5px 動かすまではドラッグ開始しない＝カードのクリック（詳細を開く）と両立
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setActiveId(id);
    draggingRef.current = true;
    // 近日締切（完了ゾーン専用）・カテゴリ列（横 SortableContext が自動アニメ）は
    // タスクの override 対象外。
    if (id.startsWith(DEADLINE_PREFIX) || id.startsWith(CATEGORY_PREFIX)) return;
    setOverride(cloneContainers(base));
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeKey = String(active.id);
    if (activeKey.startsWith(DEADLINE_PREFIX) || activeKey.startsWith(CATEGORY_PREFIX)) return;
    const overKey = String(over.id);

    const activeC = findContainer(activeKey);
    const overC = findContainer(overKey);
    // 同一列内の並べ替えは SortableContext が自動アニメーション。ここでは列間移動だけ扱う。
    if (!activeC || !overC || activeC === overC) return;

    setOverride((prev) => {
      const cur = prev ?? cloneContainers(base);
      const activeItems = cur[activeC] ?? [];
      const overItems = cur[overC] ?? [];
      if (!activeItems.includes(activeKey)) return prev;

      let newIndex: number;
      if (overKey in cur || overKey.includes("__")) {
        newIndex = overItems.length; // 空セル/列見出しへのホバー＝末尾
      } else {
        const overIndex = overItems.indexOf(overKey);
        const activeRect = active.rect.current.translated;
        const isBelow =
          activeRect && over.rect ? activeRect.top > over.rect.top + over.rect.height / 2 : false;
        newIndex = overIndex >= 0 ? overIndex + (isBelow ? 1 : 0) : overItems.length;
      }

      const next = { ...cur };
      next[activeC] = activeItems.filter((x) => x !== activeKey);
      next[overC] = [...overItems.slice(0, newIndex), activeKey, ...overItems.slice(newIndex)];
      return next;
    });
  };

  const endDrag = () => {
    setActiveId(null);
    draggingRef.current = false;
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const activeKey = String(active.id);
    if (!over) {
      endDrag();
      setOverride(null);
      return;
    }
    const overKey = String(over.id);

    // カテゴリ列の並べ替え（横方向）。over のカテゴリの直前へ挿入する位置を確定。
    if (activeKey.startsWith(CATEGORY_PREFIX)) {
      endDrag();
      const activeCatId = activeKey.slice(CATEGORY_PREFIX.length);
      const overCatId = overKey.startsWith(CATEGORY_PREFIX)
        ? overKey.slice(CATEGORY_PREFIX.length)
        : null;
      if (!overCatId || overCatId === activeCatId) return;
      const sorted = [...categories].sort((a, b) =>
        a.position < b.position ? -1 : a.position > b.position ? 1 : 0
      );
      const oldIndex = sorted.findIndex((c) => c.id === activeCatId);
      const overIndex = sorted.findIndex((c) => c.id === overCatId);
      if (oldIndex < 0 || overIndex < 0) return;
      const finalOrder = arrayMove(sorted, oldIndex, overIndex);
      const pos = finalOrder.findIndex((c) => c.id === activeCatId);
      const beforeId = pos + 1 < finalOrder.length ? finalOrder[pos + 1].id : null;
      moveCategoryBefore(activeCatId, beforeId);
      return;
    }

    // 近日締切レーン由来: 完了ゾーンへのドロップのみ消化（並べ替えはしない）。
    if (activeKey.startsWith(DEADLINE_PREFIX)) {
      if (overKey === DONE_ZONE_ID) {
        const taskId = activeKey.slice(DEADLINE_PREFIX.length);
        const t = byId.get(taskId);
        if (t) {
          completeTask(taskId);
          flashToast(t);
        }
      }
      endDrag();
      setOverride(null);
      return;
    }

    // 完了ドロップゾーン: 即アーカイブで消化＋undo トースト。
    if (overKey === DONE_ZONE_ID) {
      const t = byId.get(activeKey);
      if (t) {
        completeTask(activeKey);
        flashToast(t);
      }
      endDrag();
      setOverride(null);
      return;
    }

    const activeC = findContainer(activeKey);
    const overC = findContainer(overKey);
    if (!activeC || !overC) {
      endDrag();
      setOverride(null);
      return;
    }

    // 最終並びを確定（同一列の最終位置を arrayMove で当て込む）。
    let finalItems = [...(containers[overC] ?? [])];
    if (activeC === overC) {
      const oldIndex = finalItems.indexOf(activeKey);
      let newIndex: number;
      if (overKey in containers || overKey.includes("__")) {
        newIndex = finalItems.length - 1;
      } else {
        const overIndex = finalItems.indexOf(overKey);
        newIndex = overIndex >= 0 ? overIndex : finalItems.length - 1;
      }
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        finalItems = arrayMove(finalItems, oldIndex, newIndex);
      }
    }

    // override を最終並びに固定（tasks 反映までのチラつきを防ぐ）。
    setOverride({ ...containers, [overC]: finalItems });
    endDrag();

    // 永続化: active の次のカードの直前へ挿入（末尾なら null）。reorderTask が fractional index を採番。
    const idx = finalItems.indexOf(activeKey);
    const beforeId = idx >= 0 && idx + 1 < finalItems.length ? finalItems[idx + 1] : null;
    const categoryId = overC === UNCAT_KEY ? null : overC;
    reorderTask(activeKey, categoryId, beforeId);
  };

  const handleDragCancel = () => {
    endDrag();
    setOverride(null);
  };

  const activeCategory = activeId?.startsWith(CATEGORY_PREFIX)
    ? categories.find((c) => c.id === activeId.slice(CATEGORY_PREFIX.length))
    : undefined;
  const activeTaskId =
    activeId && !activeId.startsWith(CATEGORY_PREFIX)
      ? activeId.startsWith(DEADLINE_PREFIX)
        ? activeId.slice(DEADLINE_PREFIX.length)
        : activeId
      : undefined;
  const activeTask = activeTaskId ? byId.get(activeTaskId) : undefined;

  return (
    <OrderCtx.Provider value={{ orderedTasks }}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}

        <DragOverlay>
          {activeCategory ? (
            <div className="w-64 cursor-grabbing rounded-lg border border-input bg-card px-3 py-2 shadow-lg">
              <span className="text-[13px] font-semibold">{activeCategory.name}</span>
            </div>
          ) : activeTask ? (
            <div className="flex w-full cursor-grabbing flex-col gap-1.5 rounded-md border border-input bg-card p-2.5 text-left shadow-lg">
              <span className="text-[13px] leading-snug">{activeTask.title}</span>
              {activeTask.dueDate ? <DueChip dueDate={activeTask.dueDate} /> : null}
            </div>
          ) : null}
        </DragOverlay>

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
      </DndContext>
    </OrderCtx.Provider>
  );
}
