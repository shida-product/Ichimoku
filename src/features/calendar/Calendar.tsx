import { useState } from "react";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { APP_TODAY, parseDate } from "@/lib/date";
import { ymd } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Agenda } from "@/features/calendar/Agenda";

/**
 * カレンダー（予定専用）。週/日の切替・時間グリッドは廃止し、無限スクロールのアジェンダに一本化。
 * 仕様 §3.5: 連続した日次リストで予定を確認する。各日にシフト（勤務地）チップを併置。
 * 予定の追加/編集は保存ボタン式モーダル（EventDetailPanel）で行う。
 * 締切を設定したタスクも、その締切日のリストに表示する（クリックでタスク詳細へ）。
 */
export function Calendar() {
  const { tasks, events, shiftTypes, shifts, setShift } = useAppData();
  const { openEvent, openEventCreate, openTask, openShiftTypes } = useOverlay();

  const todayYmd = ymd(parseDate(APP_TODAY));
  // 「今日へ」で Agenda を再マウントして今日へスクロールし直す
  const [agendaKey, setAgendaKey] = useState(0);

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
      {/* ヘッダー高さは 3 カラム共通の 52px */}
      <div className="flex h-[52px] items-center gap-2 border-b border-border px-4">
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
          <Button variant="outline" size="sm" onClick={openShiftTypes} title="勤務地を管理">
            <MapPin />
            勤務地
          </Button>
          <Button variant="outline" size="sm" onClick={() => openEventCreate(todayYmd)}>
            <Plus />
            予定
          </Button>
        </div>
      </div>

      <Agenda
        key={agendaKey}
        events={events}
        tasks={tasks}
        shiftTypes={shiftTypes}
        shifts={shifts}
        todayYmd={todayYmd}
        onOpenEvent={openEvent}
        onOpenTask={openTask}
        onCreateOn={openEventCreate}
        onSetShift={setShift}
        onManageShifts={openShiftTypes}
      />
    </section>
  );
}
