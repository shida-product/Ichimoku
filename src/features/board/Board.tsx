import { useEffect, useRef, useState } from "react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { CalendarClock, Layout, Mic, Plus, Settings } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import type { Category } from "@/lib/types";
import { Lane } from "@/features/board/Lane";
import { CATEGORY_PREFIX, useBoardOrder } from "@/features/board/BoardDndProvider";
import { CompleteZone } from "@/features/board/CompleteZone";
import { Button } from "@/components/ui/button";
import { CAT_UNCAT_VAR, resolveColor } from "@/lib/palette";
import { parseTaskInput } from "@/lib/nlp/parseTask";
import { formatDue } from "@/lib/date";
import { createSpeechRecognizer, isSpeechSupported, type SpeechRecognizer } from "@/lib/speech";
import { HORIZONS, type Horizon, inHorizon } from "@/lib/timeHorizon";

const UNCAT_KEY = "uncat";
/** カテゴリ列の最小幅（px）。これを下回らない範囲で最大 MAX_COLS 列まで詰める。
    画面を縮小（ズームアウト）して枠幅が広がると、ボードはこの範囲で列が増えて広がる。 */
const MIN_COL_WIDTH = 220;
const MAX_COLS = 4;
const UNCAT_COLOR = CAT_UNCAT_VAR; // 未分類レーンのドット色（テーマ追従）

function catColor(c: Category, index: number): string {
  return resolveColor(c.color, index);
}

/**
 * タスクボード。DnD のコンテキスト・並べ替え・完了ドロップは `BoardDndProvider`
 * （近日締切レーンと共有）が受け持つ。ここはレーン描画と表示状態のみを担う。
 */
export function Board() {
  const { categories, addTask, tasks } = useAppData();
  const { orderedTasks, orderedCategories } = useBoardOrder();
  const { openTaskDraft, openHistory, openCategory } = useOverlay();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [horizon, setHorizon] = useState<Horizon>("all");
  const [quick, setQuick] = useState("");
  const [recording, setRecording] = useState(false);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const speechAvailable = isSpeechSupported();

  // 入力中の即時解析（無料の内蔵ヒューリスティック）。カテゴリ・締切を自動抽出して
  // 確定前にプレビュー表示する。本番ではここに Gemini 再解析を重ねて精度を上げる。
  // （React Compiler が自動メモ化するため手動 useMemo は使わない＝既存コード方針）
  const parsed = quick.trim() ? parseTaskInput(quick, categories) : null;
  // プレビュー用にカテゴリの表示色（スロット）を解決する。
  const parsedCatIndex = parsed?.categoryId
    ? categories.findIndex((c) => c.id === parsed.categoryId)
    : -1;
  const parsedCatColor =
    parsedCatIndex >= 0 ? resolveColor(categories[parsedCatIndex].color, parsedCatIndex) : null;

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
    if (!quick.trim()) return;
    // 解析結果（タイトル・カテゴリ・締切）をそのまま投入。未検出フィールドは null。
    const p = parsed ?? parseTaskInput(quick, categories);
    addTask({
      title: p.title,
      categoryId: p.categoryId,
      dueDate: p.dueDate,
      dueTime: p.dueTime,
    });
    setQuick("");
  };

  // 音声入力のトグル。Web Speech API で音声→テキスト化し、入力欄へ流す（確定で送信はしない）。
  const toggleRecording = () => {
    if (recording) {
      recognizerRef.current?.stop();
      return;
    }
    const rec = createSpeechRecognizer({
      onResult: (text) => setQuick(text),
      onEnd: () => setRecording(false),
      onError: () => setRecording(false),
    });
    if (!rec) return;
    recognizerRef.current = rec;
    setRecording(true);
    rec.start();
  };

  // アンマウント時に録音を確実に止める。
  useEffect(() => () => recognizerRef.current?.stop(), []);

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // 時間軸レンズ: アクティブタブの締切しきい値で各レーンを絞り込む（カテゴリ構成は不変）。
  const visibleTasks = (key: string) => {
    const list = orderedTasks(key);
    return horizon === "all" ? list : list.filter((t) => inHorizon(t.dueDate, horizon));
  };
  // タブのバッジ件数（全カテゴリ横断・アクティブタスク基準）。
  const horizonCount = (h: Horizon) =>
    h === "all" ? tasks.length : tasks.filter((t) => inHorizon(t.dueDate, h)).length;

  const uncategorized = visibleTasks(UNCAT_KEY);

  // ドラッグ中はライブ並び（push 挙動）、非ドラッグ時は base 並びを返す。
  const orderedCats = orderedCategories(categories);
  // 色はカテゴリ固有で安定させる（ライブ並べ替えで色が入れ替わらないよう、
  // 確定済み categories の index を使う）。
  const colorIndex = new Map(categories.map((c, i) => [c.id, i] as const));

  // 空き列ができて右側が間延びしないよう、列数はカテゴリ数を上限にする。
  const effectiveCols = Math.max(1, Math.min(colCount, orderedCats.length));

  // 各レーンの高さを内容から推定（厳密な実測でなく、列バランス用の近似）。
  // 見出し＋カード（タイトル）＋メモ（2行クランプ）＋締切チップ分を概算で足す。
  const laneWeight = (catId: string): number => {
    if (collapsed.has(catId)) return 1; // 折りたたみ時は見出しのみ
    let w = 1.6; // 見出し＋上下余白
    for (const t of visibleTasks(catId)) {
      w += 1; // カード基本（タイトル）
      if (t.description.trim()) w += 0.8; // メモ（2行クランプ）
      if (t.dueDate) w += 0.5; // 締切チップ行
    }
    return w;
  };

  // 列分配マソンリー（可変式）: カテゴリを順に「いま最も低い列」へ入れる。
  // round-robin（index % 列数）と違い、5 つ目が必ず 2 列目下に来るのではなく、
  // その時点で最短の列（例: 3 列目）の下へ潜り込み、列の高さが揃いやすくなる。
  const columns: Category[][] = Array.from({ length: effectiveCols }, () => []);
  const colHeights = new Array<number>(effectiveCols).fill(0);
  for (const cat of orderedCats) {
    let target = 0;
    for (let i = 1; i < effectiveCols; i++) {
      if (colHeights[i] < colHeights[target]) target = i;
    }
    columns[target].push(cat);
    colHeights[target] += laneWeight(cat.id);
  }

  return (
    <section className="relative flex min-h-0 flex-col rounded-lg border border-border bg-card">
      {/* ヘッダー高さは 3 カラム共通の 52px */}
      <div className="flex h-[52px] items-center gap-3 border-b border-border px-4">
        <span className="flex shrink-0 items-center gap-2 font-display text-[15px] font-bold">
          <Layout className="size-4 text-muted-foreground" />
          タスクボード
        </span>

        {/* パッと追加（ヘッダーに常駐・Enter で即タスク化 §3.3.1）。
            自然言語からカテゴリ・締切を自動抽出し、下のプレビュー帯に表示する。 */}
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-card px-2.5 focus-within:border-ring">
          <Plus className="size-3.5 shrink-0 text-ink-3" />
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submitQuick()}
            placeholder="タスクをパッと追加（例: 〇〇への振込 25日まで）"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] outline-none placeholder:text-ink-3"
          />
          {speechAvailable && (
            <button
              type="button"
              onClick={toggleRecording}
              title={recording ? "音声入力を停止" : "音声で入力"}
              aria-label={recording ? "音声入力を停止" : "音声で入力"}
              className={`flex shrink-0 items-center justify-center rounded p-1 transition-colors ${
                recording ? "text-crit" : "text-ink-3 hover:text-foreground"
              }`}
            >
              <Mic className={`size-3.5 ${recording ? "animate-pulse" : ""}`} />
            </button>
          )}
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
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={openCategory}
          title="カテゴリを管理"
        >
          <Settings />
          カテゴリ
        </Button>
      </div>

      {/* 自動判定プレビュー帯（入力中・検出時のみ）。Enter 前に結果を確認できる。 */}
      {parsed && (parsed.categoryName || parsed.dueDate) && (
        <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-1.5 text-[12px]">
          <span className="shrink-0 text-ink-3">自動判定</span>
          {parsed.categoryName && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: parsedCatColor ?? CAT_UNCAT_VAR }}
              />
              {parsed.categoryName}
            </span>
          )}
          {parsed.dueDate && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5">
              <CalendarClock className="size-3 text-ink-3" />
              {formatDue(parsed.dueDate, parsed.dueTime)}
            </span>
          )}
          <span className="ml-auto shrink-0 text-ink-3">Enter で追加</span>
        </div>
      )}

      {/* 時間軸レンズ（別軸タブ）。カテゴリ列はそのまま、締切から自動分類して絞り込む。 */}
      <div className="flex items-center gap-1 border-b border-border px-4 py-1.5">
        {HORIZONS.map((h) => {
          const active = horizon === h.key;
          const count = horizonCount(h.key);
          return (
            <button
              key={h.key}
              type="button"
              onClick={() => setHorizon(h.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {h.label}
              <span
                className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                  active ? "bg-primary-foreground/20" : "bg-secondary text-ink-3"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
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
          gridCols={colCount}
        />

        {/* カテゴリはカンバン型カラム。1 行あたり最大 3 列で、枠幅に応じて 1〜3 列に
            レスポンシブ。横スクロールせず、各列は中身の高さで独立に縦積み（列分配マソンリー）。
            これで 4 つ目以降は最初の列の真下へ自然に潜り込む。ハンドルで列ごと並べ替え可。 */}
        {orderedCats.length > 0 && (
          <div className="flex items-start gap-3 px-4 pt-3 pb-3">
            <SortableContext
              items={orderedCats.map((c) => CATEGORY_PREFIX + c.id)}
              strategy={rectSortingStrategy}
            >
              {columns.map((col, ci) => (
                // レーンは快適幅で頭打ち（max-w）。横幅が余ってもレーンを伸ばさず
                // 右側を余白にする＝カテゴリが少なくても間延びしない。
                <div key={ci} className="flex min-w-0 max-w-[340px] flex-1 flex-col gap-3">
                  {col.map((cat) => (
                    <Lane
                      key={cat.id}
                      variant="column"
                      categoryKey={cat.id}
                      name={cat.name}
                      color={catColor(cat, colorIndex.get(cat.id) ?? 0)}
                      tasks={visibleTasks(cat.id)}
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
      <CompleteZone onOpenHistory={openHistory} />
    </section>
  );
}
