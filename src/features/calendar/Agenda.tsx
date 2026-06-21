import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronUp, Clock, Flag, Plus } from "lucide-react";
import type { EventItem, Shift, ShiftType, Task } from "@/lib/types";
import { addDays, formatTime, parseIso, weekdayLabel, ymd } from "@/lib/calendar";
import { dueUrgency, parseDate, urgencyClasses } from "@/lib/date";
import { isHoliday } from "@/lib/holidays";
import { ShiftChip } from "@/features/shifts/ShiftChip";
import { useHighlight } from "@/features/board/HighlightContext";
import { cn } from "@/lib/utils";

/** 複数日にまたぐ予定の、指定日における時刻ラベル */
function timedLabel(e: EventItem, dy: string): string {
  const s = parseIso(e.startAt);
  const en = parseIso(e.endAt);
  const sY = ymd(s);
  const enY = ymd(en);
  if (dy === sY && dy === enY) return `${formatTime(s)}～${formatTime(en)}`;
  if (dy === sY) return `${formatTime(s)}〜`;
  if (dy === enY) return `〜${formatTime(en)}`;
  return "終日";
}

/** 初期に表示する過去/未来の日数（今日を基準とした相対オフセット） */
const INITIAL_PAST = 2;
const INITIAL_FUTURE = 21;
/** スクロール端で継ぎ足す日数 */
const PAGE = 14;

export interface AgendaProps {
  events: EventItem[];
  /** 締切付きタスク（締切日にカレンダー上へ表示する） */
  tasks: Task[];
  shiftTypes: ShiftType[];
  shifts: Shift[];
  /** 「今日」とみなす日付（'YYYY-MM-DD'） */
  todayYmd: string;
  onOpenEvent: (id: string) => void;
  onOpenTask: (id: string) => void;
  /** 指定日に新規予定を作成（保存ボタン式モーダルを開く） */
  onCreateOn: (dateYmd: string) => void;
  onSetShift: (date: string, shiftTypeId: string | null) => void;
  onManageShifts: () => void;
}

/**
 * カレンダー本体（無限スクロールのアジェンダ）。
 * 日付セクションを縦に連続して並べ、未来方向はスクロールで自動継ぎ足し、
 * 過去方向は先頭の「前を表示」で読み込む（スクロール位置は補正）。
 * 各日の見出しにシフト（勤務地）チップを置く。予定とシフトは別概念。
 */
export function Agenda({
  events,
  tasks,
  shiftTypes,
  shifts,
  todayYmd,
  onOpenEvent,
  onOpenTask,
  onCreateOn,
  onSetShift,
  onManageShifts,
}: AgendaProps) {
  const base = parseDate(todayYmd); // 今日 0:00
  // 近日締切 ⇄ ボード ⇄ カレンダーのホバー連動。highlightDate で該当日を強調し、
  // 締切タスク表示にホバーされたら逆方向に id／日付をセットして他ビューを点灯させる。
  const { highlightDate, setHighlightId, setHighlightDate } = useHighlight();
  const [startOffset, setStartOffset] = useState(-INITIAL_PAST);
  const [endOffset, setEndOffset] = useState(INITIAL_FUTURE);

  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLLIElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // 過去を継ぎ足したときにスクロール位置を保つための補正情報
  const prependRef = useRef<{ prevHeight: number; prevTop: number } | null>(null);

  const shiftByDate = (dy: string) => shifts.find((s) => s.date === dy)?.shiftTypeId ?? null;

  // 初回マウントで「今日」を先頭付近へスクロール
  useLayoutEffect(() => {
    todayRef.current?.scrollIntoView({ block: "start" });
  }, []);

  // 過去継ぎ足し後にスクロール位置を補正（増えた高さ分だけ下げる）
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const info = prependRef.current;
    if (el && info) {
      el.scrollTop = info.prevTop + (el.scrollHeight - info.prevHeight);
      prependRef.current = null;
    }
  }, [startOffset]);

  const loadPast = useCallback(() => {
    const el = scrollRef.current;
    if (el) prependRef.current = { prevHeight: el.scrollHeight, prevTop: el.scrollTop };
    setStartOffset((o) => o - PAGE);
  }, []);

  // 未来方向の無限スクロール（最下部センチネルが見えたら継ぎ足す）
  useEffect(() => {
    const sentinel = bottomRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setEndOffset((o) => o + PAGE);
      },
      { root, rootMargin: "200px" }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  const days: Date[] = [];
  for (let o = startOffset; o <= endOffset; o++) days.push(addDays(base, o));

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
      {/* 過去を読み込む */}
      <button
        type="button"
        onClick={loadPast}
        className="flex w-full cursor-pointer items-center justify-center gap-1 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent"
      >
        <ChevronUp className="size-3.5" />
        前を表示
      </button>

      <ul className="divide-y divide-border">
        {days.map((day, di) => {
          const dy = ymd(day);
          const isToday = dy === todayYmd;
          const prev = di > 0 ? days[di - 1] : null;
          const showMonth = !prev || prev.getMonth() !== day.getMonth();
          // 曜日色: 日曜・祝日＝赤(crit) / 土曜＝青(primary) / 平日＝既定。今日は別途強調。
          const dow = day.getDay();
          const dayColor =
            dow === 0 || isHoliday(day) ? "text-crit" : dow === 6 ? "text-primary" : null;

          // その日を含む予定（複数日にまたぐ予定は各日に表示）
          const ofDay = events.filter((e) => {
            const sY = ymd(parseIso(e.startAt));
            const enY = ymd(parseIso(e.endAt));
            return dy >= sY && dy <= enY;
          });
          const allDay = ofDay.filter((e) => e.allDay);
          const timed = ofDay
            .filter((e) => !e.allDay)
            .sort((a, b) => (a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0));
          // この日が締切のタスク（完了は除外）
          const dueTasks = tasks.filter((t) => t.dueDate === dy && t.status !== "done");
          const count = allDay.length + timed.length + dueTasks.length;

          return (
            <li key={dy} ref={isToday ? todayRef : undefined}>
              {showMonth ? (
                <div className="sticky top-0 z-10 bg-secondary/95 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
                  {day.getFullYear()}年{day.getMonth() + 1}月
                </div>
              ) : null}

              <div
                className={cn(
                  "flex gap-3 px-3 py-2 transition-colors",
                  dy === highlightDate && "bg-accent/20 ring-1 ring-primary/20 ring-inset"
                )}
              >
                {/* 日付列（曜日・日付・勤務地チップを縦に並べる＝勤務地は日付の真下） */}
                <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1 pt-0.5 select-none">
                  <span
                    className={cn(
                      "text-[11px]",
                      isToday ? "text-primary" : (dayColor ?? "text-ink-3")
                    )}
                  >
                    {weekdayLabel(day)}
                  </span>
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-[14px] font-semibold tabular",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : (dayColor ?? "text-foreground")
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex w-full min-w-0 justify-center">
                    <ShiftChip
                      shiftTypes={shiftTypes}
                      currentId={shiftByDate(dy)}
                      onSelect={(id) => onSetShift(dy, id)}
                      onManage={onManageShifts}
                    />
                  </div>
                </div>

                {/* 内容（予定） */}
                <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
                  {/* 予定追加 */}
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => onCreateOn(dy)}
                      className="ml-auto flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent"
                      aria-label={`${day.getMonth() + 1}/${day.getDate()} に予定を追加`}
                      title="予定を追加"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  {/* 予定リスト */}
                  {count === 0 ? (
                    <span className="py-0.5 text-[12px] text-ink-3">予定なし</span>
                  ) : (
                    <>
                      {allDay.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => onOpenEvent(e.id)}
                          className="flex items-start gap-2 rounded-md border border-transparent px-2 py-1 text-left hover:bg-accent"
                        >
                          <Clock className="mt-0.5 size-3 shrink-0 text-muted-foreground/70" />
                          <span className="w-[4.5rem] shrink-0 pt-px text-[11px] whitespace-nowrap text-muted-foreground tabular">
                            終日
                          </span>
                          <span className="min-w-0 flex-1 truncate pt-px text-[13px] font-medium">
                            {e.title || "（無題）"}
                          </span>
                        </button>
                      ))}
                      {timed.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => onOpenEvent(e.id)}
                          className="flex items-start gap-2 rounded-md border border-transparent px-2 py-1 text-left hover:bg-accent"
                        >
                          <Clock className="mt-0.5 size-3 shrink-0 text-primary/70" />
                          <span className="w-[4.5rem] shrink-0 pt-px text-[11px] whitespace-nowrap text-muted-foreground tabular">
                            {timedLabel(e, dy)}
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
                      ))}
                      {/* 締切タスク: 予定（平たい行）と区別するため、緊急度色の淡い塗りカード＋旗アイコン。
                          「自分が消化するもの」を一目で見分けられるようにする（色は種別から自動）。 */}
                      {dueTasks.map((t) => {
                        const uc = urgencyClasses(dueUrgency(dy, todayYmd));
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => onOpenTask(t.id)}
                            onPointerEnter={() => {
                              setHighlightId(t.id);
                              setHighlightDate(dy);
                            }}
                            onPointerLeave={() => {
                              setHighlightId(null);
                              setHighlightDate(null);
                            }}
                            className={cn(
                              "flex items-start gap-2 rounded-md border bg-card px-2 py-1 text-left hover:border-input",
                              uc.bar
                            )}
                          >
                            <Flag className={cn("mt-0.5 size-3 shrink-0", uc.text)} />
                            <span
                              className={cn(
                                "w-[4.5rem] shrink-0 pt-px text-[11px] whitespace-nowrap tabular",
                                uc.text
                              )}
                            >
                              締切{t.dueTime ? ` ${t.dueTime}` : ""}
                            </span>
                            <span className="min-w-0 flex-1 truncate pt-px text-[13px] font-medium">
                              {t.title || "（無題）"}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* 未来方向の無限スクロール用センチネル */}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
