import { useState } from "react";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { APP_TODAY, parseDate } from "@/lib/date";
import { dateAtMinutes, startOfDay, toLocalIso, ymd } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Agenda } from "@/features/calendar/Agenda";

/**
 * カレンダー（予定専用）。週/日の切替・時間グリッドは廃止し、無限スクロールのアジェンダに一本化。
 * 仕様 §3.5: 連続した日次リストで予定を確認する。各日にシフト（勤務地）チップを併置。
 * 時間の変更は予定詳細パネル（datetime-local）で行う。
 */
export function Calendar() {
  const { events, shiftTypes, shifts, addEvent, setShift } = useAppData();
  const { openEvent, openEventDraft, openShiftTypes } = useOverlay();

  const todayYmd = ymd(parseDate(APP_TODAY));
  // 「今日へ」で Agenda を再マウントして今日へスクロールし直す
  const [agendaKey, setAgendaKey] = useState(0);

  const createDraft = (startIso: string, endIso: string) => {
    const id = addEvent({ title: "", startAt: startIso, endAt: endIso });
    openEventDraft(id);
  };

  // ＋予定: 今日 9:00–10:00 の下書きを作って詳細パネルを開く
  const addToday = () => {
    const base = startOfDay(parseDate(APP_TODAY));
    createDraft(toLocalIso(dateAtMinutes(base, 9 * 60)), toLocalIso(dateAtMinutes(base, 10 * 60)));
  };

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-display text-[15px] font-bold">
          <CalendarDays className="size-4 text-muted-foreground" />
          カレンダー
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAgendaKey((k) => k + 1)}
            className="cursor-pointer rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent"
          >
            今日へ
          </button>
          <Button variant="outline" size="sm" onClick={openShiftTypes} title="勤務地・シフトを管理">
            <MapPin />
            勤務地
          </Button>
          <Button variant="outline" size="sm" onClick={addToday}>
            <Plus />
            予定
          </Button>
        </div>
      </div>

      <Agenda
        key={agendaKey}
        events={events}
        shiftTypes={shiftTypes}
        shifts={shifts}
        todayYmd={todayYmd}
        onOpenEvent={openEvent}
        onCreateAt={createDraft}
        onSetShift={setShift}
        onManageShifts={openShiftTypes}
      />
    </section>
  );
}
