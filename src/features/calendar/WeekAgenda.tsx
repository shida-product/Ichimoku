import type { EventItem } from "@/lib/types";
import { dateAtMinutes, formatTime, parseIso, toLocalIso, weekdayLabel, ymd } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export interface WeekAgendaProps {
  days: Date[];
  events: EventItem[];
  /** 「今日」とみなす日付（'YYYY-MM-DD'）。 */
  todayYmd: string;
  /** 日付見出しクリック → その日を日表示で開く */
  onPickDay: (day: Date) => void;
  onOpenEvent: (id: string) => void;
  onCreateAt: (startIso: string, endIso: string) => void;
}

/**
 * 週表示（アジェンダ風リスト）。
 * 日付セクションを縦に並べ、各日の予定を時刻順の行リストで表示する。
 * - 終日予定は時刻の代わりに「終日」チップ。
 * - 予定の無い日は「予定なし」を淡色表示。
 * - 日付見出しクリックでその日の時間グリッド（日表示）へ。＋でその日に予定を新規作成。
 * 時間グリッド（ドラッグ移動・リサイズ）は日表示側（TimeGrid）が担う。
 */
export function WeekAgenda({
  days,
  events,
  todayYmd,
  onPickDay,
  onOpenEvent,
  onCreateAt,
}: WeekAgendaProps) {
  // 各日の予定を「終日 → 時刻順」で並べる
  const perDay = days.map((day) => {
    const dy = ymd(day);
    const ofDay = events.filter((e) => ymd(parseIso(e.startAt)) === dy);
    const allDay = ofDay.filter((e) => e.allDay);
    const timed = ofDay
      .filter((e) => !e.allDay)
      .sort((a, b) => (a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0));
    return { allDay, timed };
  });

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <ul className="divide-y divide-border">
        {days.map((day, di) => {
          const isToday = ymd(day) === todayYmd;
          const { allDay, timed } = perDay[di];
          const count = allDay.length + timed.length;
          return (
            <li key={ymd(day)} className="flex gap-3 px-3 py-2">
              {/* 日付見出し（クリックで日表示へ） */}
              <button
                type="button"
                onClick={() => onPickDay(day)}
                className="flex w-11 shrink-0 cursor-pointer flex-col items-center gap-0.5 pt-0.5 select-none"
                title={`${day.getMonth() + 1}/${day.getDate()} を日表示で開く`}
              >
                <span className={cn("text-[11px]", isToday ? "text-primary" : "text-ink-3")}>
                  {weekdayLabel(day)}
                </span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-[14px] font-semibold tabular",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}
                >
                  {day.getDate()}
                </span>
              </button>

              {/* その日の予定リスト */}
              <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
                {count === 0 ? (
                  <span className="py-1 text-[12px] text-ink-3">予定なし</span>
                ) : (
                  <>
                    {allDay.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onOpenEvent(e.id)}
                        className="flex items-start gap-2 rounded-md px-2 py-1 text-left hover:bg-accent"
                      >
                        <span className="mt-px w-1 shrink-0 self-stretch rounded-full bg-muted-foreground/40" />
                        <span className="w-[5.5rem] shrink-0 pt-px text-[11px] whitespace-nowrap text-muted-foreground tabular">
                          終日
                        </span>
                        <span className="min-w-0 flex-1 truncate pt-px text-[13px] font-medium">
                          {e.title || "（無題）"}
                        </span>
                      </button>
                    ))}
                    {timed.map((e) => {
                      const s = parseIso(e.startAt);
                      const en = parseIso(e.endAt);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => onOpenEvent(e.id)}
                          className="flex items-start gap-2 rounded-md px-2 py-1 text-left hover:bg-accent"
                        >
                          <span className="mt-px w-1 shrink-0 self-stretch rounded-full bg-primary/50" />
                          <span className="w-[5.5rem] shrink-0 pt-px text-[11px] whitespace-nowrap text-muted-foreground tabular">
                            {formatTime(s)}～{formatTime(en)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">
                              {e.title || "（無題）"}
                            </span>
                            {e.location ? (
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {e.location}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>

              {/* その日に予定を追加（9:00–10:00 の下書き） */}
              <button
                type="button"
                onClick={() =>
                  onCreateAt(
                    toLocalIso(dateAtMinutes(day, 9 * 60)),
                    toLocalIso(dateAtMinutes(day, 10 * 60))
                  )
                }
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center self-start rounded text-muted-foreground hover:bg-accent"
                aria-label={`${day.getMonth() + 1}/${day.getDate()} に予定を追加`}
              >
                <Plus className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
