import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { APP_TODAY, parseDate } from "@/lib/date";
import {
  addDays,
  dateAtMinutes,
  formatMonthDay,
  startOfDay,
  toLocalIso,
  weekDays,
  weekdayLabel,
  ymd,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TimeGrid } from "@/features/calendar/TimeGrid";
import { WeekAgenda } from "@/features/calendar/WeekAgenda";

type View = "week" | "day";

/**
 * カレンダー（予定専用・自作の時間グリッド）。
 * 仕様 §3.5: デフォルトは週相当の複数日表示、日見出しクリックで日表示に展開。
 * 仕様 §6.1: ドラッグで時間移動、下端ドラッグでリサイズ、15分スナップ（TimeGrid 側）。
 */
export function Calendar() {
  const { events, addEvent, updateEvent } = useAppData();
  const { openEvent, openEventDraft } = useOverlay();

  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date>(() => parseDate(APP_TODAY));

  const days = view === "week" ? weekDays(anchor) : [startOfDay(anchor)];

  const shift = (dir: -1 | 1) => setAnchor((a) => addDays(a, dir * (view === "week" ? 7 : 1)));
  const goToday = () => setAnchor(parseDate(APP_TODAY));

  const title =
    view === "week"
      ? `${formatMonthDay(days[0])} – ${formatMonthDay(days[6])}`
      : `${formatMonthDay(anchor)}（${weekdayLabel(anchor)}）`;

  // ＋予定: 表示中の基準日 9:00–10:00 の下書きを作って詳細パネルを開く
  const addAtAnchor = () => {
    const base = startOfDay(anchor);
    const id = addEvent({
      title: "",
      startAt: toLocalIso(dateAtMinutes(base, 9 * 60)),
      endAt: toLocalIso(dateAtMinutes(base, 10 * 60)),
    });
    openEventDraft(id);
  };

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-display text-[15px] font-bold">
          <CalendarDays className="size-4 text-muted-foreground" />
          カレンダー
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* 週/日 切替 */}
          <div className="flex overflow-hidden rounded-md border border-border">
            {(["week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "px-2 py-1 text-[12px] transition-colors",
                  view === v
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                {v === "week" ? "週" : "日"}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addAtAnchor}>
            <Plus />
            予定
          </Button>
        </div>
      </div>

      {/* ナビゲーション（期間ラベル＋前後＋今日） */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-1.5">
        <span className="text-[13px] font-medium tabular">{title}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent"
            aria-label="前へ"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="cursor-pointer rounded px-2 py-0.5 text-[12px] text-muted-foreground hover:bg-accent"
          >
            今日
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent"
            aria-label="次へ"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {view === "week" ? (
        <WeekAgenda
          days={days}
          events={events}
          todayYmd={ymd(parseDate(APP_TODAY))}
          onPickDay={(day) => {
            setAnchor(startOfDay(day));
            setView("day");
          }}
          onOpenEvent={openEvent}
          onCreateAt={(startIso, endIso) => {
            const id = addEvent({ title: "", startAt: startIso, endAt: endIso });
            openEventDraft(id);
          }}
        />
      ) : (
        <TimeGrid
          days={days}
          events={events}
          todayYmd={ymd(parseDate(APP_TODAY))}
          onPickDay={(day) => {
            setAnchor(startOfDay(day));
            setView("day");
          }}
          onOpenEvent={openEvent}
          onCreateAt={(startIso, endIso) => {
            const id = addEvent({ title: "", startAt: startIso, endAt: endIso });
            openEventDraft(id);
          }}
          onCommit={(id, startIso, endIso) => updateEvent(id, { startAt: startIso, endAt: endIso })}
        />
      )}
    </section>
  );
}
