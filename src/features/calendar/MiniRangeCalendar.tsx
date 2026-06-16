import { useState } from "react";
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
 * 月グリッドの期間ピッカー（連続した日付範囲を 2 クリックで選ぶ）。
 * 1 クリック目で単日（start=end）、2 クリック目で範囲を確定（前後は自動で並べ替え）。
 * 予定登録モーダルの日付選択に使う。終日/時間に依らず「いつ」を決める部分。
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
              onClick={() => pick(dy)}
              className={cn(
                "flex h-9 items-center justify-center text-[12px] tabular transition-colors",
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
