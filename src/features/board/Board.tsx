import { useEffect, useRef, useState } from "react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { Layout, Plus } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import type { Category } from "@/lib/types";
import { Lane } from "@/features/board/Lane";
import { CATEGORY_PREFIX, useBoardOrder } from "@/features/board/BoardDndProvider";
import { CompleteZone } from "@/features/board/CompleteZone";
import { Button } from "@/components/ui/button";

const UNCAT_KEY = "uncat";
/** カテゴリ列の最小幅（px）。これを下回らない範囲で最大 3 列まで詰める。 */
const MIN_COL_WIDTH = 220;
const MAX_COLS = 3;
const UNCAT_COLOR = "#9aa29f"; // 未分類レーンのドット色
const CAT_FALLBACK = ["#6b7c93", "#8a6d3b", "#7a5c8e", "#3f7e72", "#9a6b6b", "#6b8a7a"];

function catColor(c: Category, index: number): string {
  return c.color ?? CAT_FALLBACK[index % CAT_FALLBACK.length];
}

/**
 * タスクボード。DnD のコンテキスト・並べ替え・完了ドロップは `BoardDndProvider`
 * （近日締切レーンと共有）が受け持つ。ここはレーン描画と表示状態のみを担う。
 */
export function Board() {
  const { categories, archivedTasks, addTask } = useAppData();
  const { orderedTasks } = useBoardOrder();
  const { openTaskDraft, openHistory } = useOverlay();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [quick, setQuick] = useState("");

  // カテゴリ列のレスポンシブ列数（画面/枠幅に応じて 1〜3 列）。
  const scrollRef = useRef<HTMLDivElement>(null);
  const [colCount, setColCount] = useState(MAX_COLS);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const compute = () => {
      // px-4（左右 16px）ぶんを引いた実コンテンツ幅で列数を決める。
      const w = el.clientWidth - 32;
      setColCount(Math.max(1, Math.min(MAX_COLS, Math.floor(w / MIN_COL_WIDTH))));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const submitQuick = () => {
    const title = quick.trim();
    if (!title) return;
    addTask({ title });
    setQuick("");
  };

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const uncategorized = orderedTasks(UNCAT_KEY);

  // カテゴリを round-robin で colCount 列に振り分ける（列分配マソンリー）。
  // index i → 列 i % colCount。各列は中身の高さで独立に縦積みされるため、
  // 4 つ目（index 3・3 列時）は 1 つ目（index 0）の真下に自然に収まる。
  const columns: { cat: Category; index: number }[][] = Array.from({ length: colCount }, () => []);
  categories.forEach((cat, index) => {
    columns[index % colCount].push({ cat, index });
  });

  return (
    <section className="relative flex min-h-0 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex shrink-0 items-center gap-2 font-display text-[15px] font-bold">
          <Layout className="size-4 text-muted-foreground" />
          タスクボード
        </span>

        {/* パッと追加（ヘッダーに常駐・Enter で未分類に即タスク化 §3.3.1） */}
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-card px-2.5 focus-within:border-ring">
          <Plus className="size-3.5 shrink-0 text-ink-3" />
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitQuick()}
            placeholder="タスクをパッと追加（Enter）— 未分類へ"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] outline-none placeholder:text-ink-3"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            const id = addTask({ title: "" });
            openTaskDraft(id);
          }}
        >
          <Plus />
          タスク
        </Button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto pt-1 pb-2">
        {/* 未分類レーン（常に先頭・全幅・控えめ＝現状通り） */}
        <Lane
          categoryKey={UNCAT_KEY}
          name="未分類"
          color={UNCAT_COLOR}
          tasks={uncategorized}
          collapsed={collapsed.has(UNCAT_KEY)}
          onToggle={() => toggle(UNCAT_KEY)}
          muted
        />

        {/* カテゴリはカンバン型カラム。1 行あたり最大 3 列で、枠幅に応じて 1〜3 列に
            レスポンシブ。横スクロールせず、各列は中身の高さで独立に縦積み（列分配マソンリー）。
            これで 4 つ目以降は最初の列の真下へ自然に潜り込む。ハンドルで列ごと並べ替え可。 */}
        {categories.length > 0 && (
          <div className="flex items-start gap-3 px-4 pt-3 pb-3">
            <SortableContext
              items={categories.map((c) => CATEGORY_PREFIX + c.id)}
              strategy={rectSortingStrategy}
            >
              {columns.map((col, ci) => (
                <div key={ci} className="flex min-w-0 flex-1 flex-col gap-3">
                  {col.map(({ cat, index }) => (
                    <Lane
                      key={cat.id}
                      variant="column"
                      categoryKey={cat.id}
                      name={cat.name}
                      color={catColor(cat, index)}
                      tasks={orderedTasks(cat.id)}
                      collapsed={collapsed.has(cat.id)}
                      onToggle={() => toggle(cat.id)}
                    />
                  ))}
                </div>
              ))}
            </SortableContext>
          </div>
        )}
      </div>

      {/* 共有の完了ドロップゾーン（ボード下部に固定）。DnD は BoardDndProvider が担う。 */}
      <CompleteZone totalCount={archivedTasks.length} onOpenHistory={openHistory} />
    </section>
  );
}
