import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, startOfWeek, ymd } from "@/lib/calendar";
import { parseDate } from "@/lib/date";
import { cn } from "@/lib/utils";

const WD = ["日", "月", "火", "水", "木", "金", "土"];

export interface DateRange {
  /** 'YYYY-MM-DD' */
  start: string;
  /** 'YYYY-MM-DD'（単日なら start と同じ） */
  end: string;
}

/**
 * 月グリッドの期間ピッカー（連続した日付範囲を選ぶ）。
 *
 * 2 通りの操作に対応:
 * - **ドラッグ**: 起点でポインタを押し、なぞった範囲をその場で確定（マウス・タッチ両対応）。
 * - **2 クリック**: 1 クリック目で単日（start=end）、2 クリック目で範囲を確定。
 *   月をまたぐ範囲は月ナビ後の 2 クリックで選べる（ドラッグは同一表示内のみ）。
 *
 * いずれも前後は自動で並べ替える。予定登録モーダルの日付選択に使う。
 * 終日/時間に依らず「いつ」を決める部分。
 */
export function MiniRangeCalendar({
  value,
  onChange,
  todayYmd,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  todayYmd: string;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseDate(value.start);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  // 範囲選択の起点（2 クリック方式）。null = 次クリックで新しい範囲を開始。
  const [anchor, setAnchor] = useState<string | null>(null);
  // ドラッグ選択の状態。anchor=押下日、moved=別日まで動いたか（= 単発クリックと区別）。
  const drag = useRef<{ anchor: string; moved: boolean } | null>(null);

  const gridStart = startOfWeek(viewMonth);
  const days: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const pick = (dy: string) => {
    if (anchor === null) {
      setAnchor(dy);
      onChange({ start: dy, end: dy });
    } else {
      const [s, e] = anchor <= dy ? [anchor, dy] : [dy, anchor];
      onChange({ start: s, end: e });
      setAnchor(null);
    }
  };

  // ポインタ座標の真下にある日セルの 'YYYY-MM-DD' を返す（タッチでも追従させるため）。
  const dyAtPoint = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    return el?.closest<HTMLElement>("[data-dy]")?.dataset.dy ?? null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>, dy: string) => {
    // 同要素にポインタを固定し、なぞる間ずっと move/up を受け取る（カラム外でも追従）。
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { anchor: dy, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = dyAtPoint(e.clientX, e.clientY);
    if (!dy) return;
    if (dy !== d.anchor) d.moved = true;
    const [s, end] = d.anchor <= dy ? [d.anchor, dy] : [dy, d.anchor];
    onChange({ start: s, end });
  };

  const onPointerUp = (dy: string) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      // ドラッグで確定済み。2 クリックの起点はリセット。
      setAnchor(null);
    } else {
      // 動かなかった = 単発クリック。従来の 2 クリック方式に委ねる。
      pick(dy);
    }
  };

  const inRange = (dy: string) => dy >= value.start && dy <= value.end;
  const isEdge = (dy: string) => dy === value.start || dy === value.end;

  return (
    <div className="rounded-md border border-input p-2">
      {/* 月ナビ */}
      <div className="mb-1.5 flex items-center justify-between px-1">
        <button
          type="button"
          aria-label="前の月"
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-[13px] font-medium tabular">
          {viewMonth.getFullYear()}年{viewMonth.getMonth() + 1}月
        </span>
        <button
          type="button"
          aria-label="次の月"
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* 曜日見出し */}
      <div className="grid grid-cols-7 text-center text-[10px] text-ink-3">
        {WD.map((w) => (
          <span key={w} className="py-0.5">
            {w}
          </span>
        ))}
      </div>

      {/* 日グリッド */}
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dy = ymd(d);
          const otherMonth = d.getMonth() !== viewMonth.getMonth();
          const selected = inRange(dy);
          const edge = isEdge(dy);
          const today = dy === todayYmd;
          return (
            <button
              key={dy}
              type="button"
              data-dy={dy}
              onPointerDown={(e) => onPointerDown(e, dy)}
              onPointerMove={onPointerMove}
              onPointerUp={() => onPointerUp(dy)}
              onPointerCancel={() => {
                drag.current = null;
              }}
              className={cn(
                "flex h-9 touch-none select-none items-center justify-center text-[12px] tabular transition-colors",
                selected && !edge && "bg-primary/15",
                dy === value.start && "rounded-l-md",
                dy === value.end && "rounded-r-md",
                edge
                  ? "bg-primary font-semibold text-primary-foreground"
                  : otherMonth
                    ? "text-ink-3/50 hover:bg-accent"
                    : "text-foreground hover:bg-accent",
                today && !edge && "ring-1 ring-primary/50 ring-inset"
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
