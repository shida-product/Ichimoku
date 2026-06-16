import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { EventItem } from "@/lib/types";
import {
  SNAP_MIN,
  clamp,
  dateAtMinutes,
  formatTime,
  layoutDay,
  minutesOfDay,
  parseIso,
  snap,
  toLocalIso,
  weekdayLabel,
  ymd,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

// ── グリッドの寸法 ──
const START_HOUR = 0;
const END_HOUR = 24;
const HOUR_PX = 44; // 1 時間の高さ
const GUTTER_PX = 40; // 時刻ラベル列の幅
const MIN_DUR = SNAP_MIN; // 最小イベント長（分）
const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;
const GRID_H = (END_HOUR - START_HOUR) * HOUR_PX;
const DRAG_THRESHOLD = 4; // これ未満の移動はクリック扱い

function minToY(min: number): number {
  return ((min - START_HOUR * 60) / 60) * HOUR_PX;
}
function yToMin(y: number): number {
  return START_HOUR * 60 + (y / HOUR_PX) * 60;
}

interface Drag {
  id: string;
  mode: "move" | "resize";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  origStartMin: number;
  origEndMin: number;
  origDayIndex: number;
  colWidth: number;
  dayIndex: number; // プレビュー中の日
  startMin: number; // プレビュー
  endMin: number; // プレビュー
  moved: boolean;
}

export interface TimeGridProps {
  days: Date[];
  events: EventItem[];
  /** 「今日」とみなす日付（'YYYY-MM-DD'）。アプリ基準日に揃えるため呼び出し側から渡す。 */
  todayYmd: string;
  /** 週表示で日見出しをクリック → その日を日表示で開く */
  onPickDay?: (day: Date) => void;
  onOpenEvent: (id: string) => void;
  onCreateAt: (startIso: string, endIso: string) => void;
  onCommit: (id: string, startIso: string, endIso: string) => void;
}

/**
 * 自作の時間グリッド（週/日共通）。
 * - 縦軸＝時刻（0〜24時、15分スナップ）、横＝日。
 * - イベントは絶対配置。本体ドラッグで時間移動（週では横ドラッグで日移動）、
 *   下端ハンドルのドラッグでリサイズ。空き領域クリックで 1 時間の予定を新規作成。
 */
export function TimeGrid({
  days,
  events,
  todayYmd,
  onPickDay,
  onOpenEvent,
  onCreateAt,
  onCommit,
}: TimeGridProps) {
  const colsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // drag はレンダリング用に state、ハンドラ内の判定用に ref を真実の値とする
  // （高速クリック時に state クロージャが古く drag=null となり詳細が開かない問題を回避）。
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDragState] = useState<Drag | null>(null);
  const setDrag = (next: Drag | null) => {
    dragRef.current = next;
    setDragState(next);
  };

  // 初回マウント時、朝（7:00）が見えるようスクロール
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = minToY(7 * 60);
  }, []);

  // 各日の時間イベントを重なり考慮で配置
  const perDay = days.map((day) => {
    const dy = ymd(day);
    const items = events
      .filter((e) => !e.allDay && ymd(parseIso(e.startAt)) === dy)
      .map((e) => {
        const s = parseIso(e.startAt);
        const en = parseIso(e.endAt);
        const startMin = minutesOfDay(s);
        // 翌日にまたぐ場合は当日末まででクランプ（このツールでは稀）
        let endMin = ymd(en) === dy ? minutesOfDay(en) : TOTAL_MIN;
        if (endMin <= startMin) endMin = Math.min(startMin + MIN_DUR, TOTAL_MIN);
        return { event: e, startMin, endMin };
      });
    return layoutDay(items);
  });

  const allDayPerDay = days.map((day) =>
    events.filter((e) => e.allDay && ymd(parseIso(e.startAt)) === ymd(day))
  );
  const hasAllDay = allDayPerDay.some((list) => list.length > 0);

  const startDrag = (
    e: ReactPointerEvent,
    mode: "move" | "resize",
    ev: { id: string; startMin: number; endMin: number },
    dayIndex: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const colsW = colsRef.current?.clientWidth ?? 0;
    const colWidth = days.length > 0 ? colsW / days.length : colsW;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      id: ev.id,
      mode,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origStartMin: ev.startMin,
      origEndMin: ev.endMin,
      origDayIndex: dayIndex,
      colWidth,
      dayIndex,
      startMin: ev.startMin,
      endMin: ev.endMin,
      moved: false,
    });
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    const moved = drag.moved || Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD;
    const deltaMin = snap(Math.round((dy / HOUR_PX) * 60));

    if (drag.mode === "move") {
      const dur = drag.origEndMin - drag.origStartMin;
      const startMin = clamp(drag.origStartMin + deltaMin, 0, TOTAL_MIN - dur);
      const dayShift = drag.colWidth > 0 ? Math.round(dx / drag.colWidth) : 0;
      const dayIndex = clamp(drag.origDayIndex + dayShift, 0, days.length - 1);
      setDrag({ ...drag, moved, startMin, endMin: startMin + dur, dayIndex });
    } else {
      const endMin = clamp(drag.origEndMin + deltaMin, drag.origStartMin + MIN_DUR, TOTAL_MIN);
      setDrag({ ...drag, moved, endMin });
    }
  };

  const endDrag = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (drag.moved) {
      const day = days[drag.dayIndex];
      onCommit(
        drag.id,
        toLocalIso(dateAtMinutes(day, drag.startMin)),
        toLocalIso(dateAtMinutes(day, drag.endMin))
      );
    } else {
      onOpenEvent(drag.id);
    }
    setDrag(null);
  };

  const createAt = (day: Date, offsetY: number) => {
    const start = clamp(snap(Math.round(yToMin(offsetY))), 0, TOTAL_MIN - 60);
    onCreateAt(toLocalIso(dateAtMinutes(day, start)), toLocalIso(dateAtMinutes(day, start + 60)));
  };

  const hourLines = {
    backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 日見出し（時刻ガター分の余白＋各日） */}
      <div className="flex border-b border-border pr-1.5" style={{ paddingLeft: GUTTER_PX }}>
        {days.map((day, di) => {
          const isToday = ymd(day) === todayYmd;
          const single = days.length === 1;
          return (
            <button
              key={ymd(day)}
              type="button"
              onClick={() => onPickDay?.(day)}
              disabled={single}
              className={cn(
                "flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-1.5 text-center select-none",
                single && "cursor-default"
              )}
            >
              <span className={cn("text-[11px]", isToday ? "text-primary" : "text-ink-3")}>
                {weekdayLabel(day)}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[13px] font-semibold tabular",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                )}
              >
                {day.getDate()}
              </span>
              {/* 当日の終日予定数バッジ（あれば） */}
              {allDayPerDay[di].length > 0 ? (
                <span className="text-[10px] text-muted-foreground">
                  終日{allDayPerDay[di].length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 終日帯（終日予定があるときだけ表示） */}
      {hasAllDay ? (
        <div className="flex border-b border-border pr-1.5" style={{ paddingLeft: GUTTER_PX }}>
          {days.map((day, di) => (
            <div key={ymd(day)} className="flex flex-1 flex-col gap-0.5 p-1">
              {allDayPerDay[di].map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onOpenEvent(e.id)}
                  className="truncate rounded bg-secondary px-1.5 py-0.5 text-left text-[11px] hover:bg-accent"
                  title={e.title}
                >
                  {e.title || "（無題）"}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {/* 時間グリッド本体（スクロール） */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div className="flex" style={{ height: GRID_H }}>
          {/* 時刻ガター */}
          <div className="relative shrink-0" style={{ width: GUTTER_PX }}>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
              const h = START_HOUR + i;
              return (
                <span
                  key={h}
                  className="absolute right-1 -translate-y-1/2 text-[10px] text-ink-3 tabular"
                  style={{ top: i * HOUR_PX }}
                >
                  {h === 24 ? "" : `${h}:00`}
                </span>
              );
            })}
          </div>

          {/* 日カラム群 */}
          <div ref={colsRef} className="flex flex-1">
            {days.map((day, di) => (
              <div
                key={ymd(day)}
                className="relative flex-1 border-l border-border"
                style={hourLines}
              >
                {/* 背景（空きクリックで新規作成） */}
                <div
                  className="absolute inset-0"
                  onClick={(e) => createAt(day, e.nativeEvent.offsetY)}
                />

                {/* 時間イベント */}
                {perDay[di].map((pe) => {
                  const isDragging = drag?.id === pe.event.id;
                  // ドラッグ中の要素は、アンマウントを防ぐため開始時の元カラム(origDayIndex)でのみ描画する
                  if (isDragging && drag!.origDayIndex !== di) return null;
                  const startMin = isDragging ? drag!.startMin : pe.startMin;
                  const endMin = isDragging ? drag!.endMin : pe.endMin;
                  const top = minToY(startMin);
                  const height = Math.max(minToY(endMin) - top, 16);
                  const widthPct = isDragging ? 100 : 100 / pe.cols;
                  const leftPct = isDragging
                    ? (drag!.dayIndex - drag!.origDayIndex) * 100
                    : (100 / pe.cols) * pe.col;
                  const compact = height < 34;
                  return (
                    <div
                      key={pe.event.id}
                      onPointerDown={(e) =>
                        startDrag(e, "move", { id: pe.event.id, startMin, endMin }, di)
                      }
                      onPointerMove={onPointerMove}
                      onPointerUp={endDrag}
                      className={cn(
                        "absolute touch-none overflow-hidden rounded-md border px-1.5 py-0.5 text-left",
                        "border-primary/40 bg-primary/15 text-foreground",
                        isDragging
                          ? "z-20 cursor-grabbing shadow-lg"
                          : "cursor-grab hover:bg-primary/25"
                      )}
                      style={{
                        top,
                        height,
                        left: `calc(${leftPct}% + 1px)`,
                        width: `calc(${widthPct}% - 2px)`,
                      }}
                      title={pe.event.title}
                    >
                      <div className="truncate text-[11px] font-medium leading-tight">
                        {pe.event.title || "（無題）"}
                      </div>
                      {!compact ? (
                        <div className="truncate text-[10px] text-muted-foreground tabular">
                          {formatTime(dateAtMinutes(day, startMin))}–
                          {formatTime(dateAtMinutes(day, endMin))}
                        </div>
                      ) : null}
                      {/* 下端リサイズハンドル */}
                      <div
                        onPointerDown={(e) =>
                          startDrag(e, "resize", { id: pe.event.id, startMin, endMin }, di)
                        }
                        onPointerMove={onPointerMove}
                        onPointerUp={endDrag}
                        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
