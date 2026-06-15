import { CalendarDays, Plus } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { APP_TODAY, parseDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const WD = ["日", "月", "火", "水", "木", "金", "土"];
const DAYS_AHEAD = 7;

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * カレンダー（予定専用・自作のアジェンダ表示）。
 * v1 は当日から数日分を縦に並べる。予定クリックで詳細（side-peek）を開く。
 * ※ Step 11 で週/日グリッド＋DnD、Step 12-13 で Google 連携へ拡張予定。
 */
export function Calendar() {
  const { events, addEvent } = useAppData();
  const { openEvent, openEventDraft } = useOverlay();

  const start = parseDate(APP_TODAY);
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const ymd = toYmd(d);
    const dayEvents = events
      .filter((e) => e.startAt.slice(0, 10) === ymd)
      .sort((a, b) => (a.startAt < b.startAt ? -1 : 1));
    return { date: d, ymd, isToday: i === 0, events: dayEvents };
  });

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-display text-[15px] font-bold">
          <CalendarDays className="size-4 text-muted-foreground" />
          カレンダー
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const id = addEvent({
              title: "",
              startAt: `${APP_TODAY}T09:00:00`,
              endAt: `${APP_TODAY}T10:00:00`,
            });
            openEventDraft(id);
          }}
        >
          <Plus />
          予定
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2.5 py-2">
        {days.map((day) => (
          <div
            key={day.ymd}
            className={cn(
              "grid grid-cols-[52px_1fr] gap-2.5 rounded-md px-2 py-2",
              "border-t border-border first:border-t-0",
              day.isToday && "bg-accent/60"
            )}
          >
            <div>
              <div
                className={cn(
                  "text-[17px] font-bold tabular",
                  day.isToday ? "text-primary" : "text-foreground"
                )}
              >
                {day.date.getDate()}
              </div>
              <div className={cn("text-[11px]", day.isToday ? "text-primary" : "text-ink-3")}>
                {WD[day.date.getDay()]}
                {day.isToday ? "・今日" : ""}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-0.5">
              {day.events.length === 0 ? (
                <span className="text-[11px] text-ink-3">予定なし</span>
              ) : (
                day.events.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => openEvent(e.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-left transition-colors hover:border-input",
                      day.isToday
                        ? "border-l-[3px] border-l-primary border-border bg-card"
                        : "border-border bg-secondary"
                    )}
                  >
                    <span className="min-w-[40px] text-[11px] text-muted-foreground tabular">
                      {hhmm(e.startAt)}
                    </span>
                    <span className="text-[12.5px]">{e.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
