import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import {
  AutoTextarea,
  PanelFooterRow,
  PanelShell,
  fieldClass,
  titleInputClass,
} from "@/features/_shared/panel";
import { Switch } from "@/components/ui/switch";
import { MiniRangeCalendar, type DateRange } from "@/features/calendar/MiniRangeCalendar";
import { parseIso, ymd } from "@/lib/calendar";
import { APP_TODAY } from "@/lib/date";
import { Button } from "@/components/ui/button";

/** 時間ドロップダウンの刻み（分） */
const STEP_MIN = 15;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function minToHHMM(m: number): string {
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}
function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/** 0:00〜23:45 を STEP_MIN 刻みで（value=HH:mm, label=H:mm） */
const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let m = 0; m < 24 * 60; m += STEP_MIN) {
  TIME_OPTIONS.push({ value: minToHHMM(m), label: `${Math.floor(m / 60)}:${pad2(m % 60)}` });
}

/**
 * 予定の新規登録 / 編集（side-peek・保存ボタン式 = option B）。
 *
 * - 日付はカレンダーグリッドで選ぶ（連続した期間 = 1 予定）。
 * - 既定は「終日」。トグルで時間設定に切り替えると開始/終了の 2 つのプルダウンが出る。
 * - 同一日内では終了時間は開始時間より後しか選べない（複数日にまたぐ場合は制限なし）。
 * - 時間設定をする場合は開始・終了が埋まり、かつ終了が開始より後でないと保存できない。
 */
export function EventDetailPanel({
  eventId,
  initialDate,
  onClose,
}: {
  eventId: string | null;
  initialDate?: string;
  onClose: () => void;
}) {
  const { events, addEvent, updateEvent, deleteEvent } = useAppData();
  const existing = eventId ? events.find((e) => e.id === eventId) : undefined;

  // 初期値（編集時は既存予定から、新規時は initialDate / 既定値から）
  const init = useMemo(() => {
    if (existing) {
      const s = parseIso(existing.startAt);
      const e = parseIso(existing.endAt);
      return {
        title: existing.title,
        range: { start: ymd(s), end: ymd(e) } as DateRange,
        allDay: existing.allDay,
        startTime: minToHHMM(s.getHours() * 60 + s.getMinutes()),
        endTime: minToHHMM(e.getHours() * 60 + e.getMinutes()),
        location: existing.location ?? "",
        notes: existing.notes ?? "",
      };
    }
    const d = initialDate ?? APP_TODAY;
    return {
      title: "",
      range: { start: d, end: d } as DateRange,
      allDay: true,
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      notes: "",
    };
    // eventId/initialDate でこのパネルは再マウントされる（AppShell の key）。初回だけ評価。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [title, setTitle] = useState(init.title);
  const [range, setRange] = useState<DateRange>(init.range);
  const [allDay, setAllDay] = useState(init.allDay);
  const [startTime, setStartTime] = useState(init.startTime);
  const [endTime, setEndTime] = useState(init.endTime);
  const [location, setLocation] = useState(init.location);
  const [notes, setNotes] = useState(init.notes);

  const sameDay = range.start === range.end;
  // 同一日内のときだけ「終了 > 開始」を強制（複数日にまたぐなら任意）
  const endOptions = sameDay
    ? TIME_OPTIONS.filter((o) => hhmmToMin(o.value) > hhmmToMin(startTime))
    : TIME_OPTIONS;

  const onChangeStart = (v: string) => {
    setStartTime(v);
    // 同一日で終了が開始以前になったら、終了を開始の次の枠へ繰り上げる
    if (sameDay && hhmmToMin(endTime) <= hhmmToMin(v)) {
      const next = Math.min(hhmmToMin(v) + STEP_MIN, 23 * 60 + 45);
      setEndTime(minToHHMM(next));
    }
  };

  // 保存可否
  const timeValid =
    allDay || (!!startTime && !!endTime && (!sameDay || hhmmToMin(endTime) > hhmmToMin(startTime)));
  const canSave = title.trim() !== "" && timeValid;

  const save = () => {
    if (!canSave) return;
    const startAt = allDay ? `${range.start}T00:00:00` : `${range.start}T${startTime}:00`;
    const endAt = allDay ? `${range.end}T23:59:00` : `${range.end}T${endTime}:00`;
    const payload = {
      title: title.trim(),
      startAt,
      endAt,
      allDay,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };
    if (existing) {
      updateEvent(existing.id, payload);
    } else {
      addEvent(payload);
    }
    onClose();
  };

  // 編集対象が見つからない（削除済みなど）
  if (eventId && !existing) return null;

  const footer = (
    <PanelFooterRow
      left={
        existing ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              deleteEvent(existing.id);
              onClose();
            }}
          >
            <Trash2 className="size-3.5" /> 削除
          </Button>
        ) : null
      }
      right={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            キャンセル
          </Button>
          <Button size="sm" disabled={!canSave} onClick={save}>
            {existing ? "更新" : "保存"}
          </Button>
        </>
      }
    />
  );

  return (
    <PanelShell label={existing ? "予定" : "予定を追加"} onClose={onClose} footer={footer}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus={title === ""}
        className={titleInputClass}
        placeholder="予定のタイトル"
      />

      {/* 日付（カレンダーグリッドで期間選択） */}
      <div>
        <span className="mb-1.5 block text-xs text-muted-foreground">
          日付
          {sameDay ? null : (
            <span className="ml-1 text-ink-3">
              {range.start} 〜 {range.end}
            </span>
          )}
        </span>
        <MiniRangeCalendar value={range} onChange={setRange} todayYmd={APP_TODAY} />
      </div>

      {/* 終日トグル＋時間設定 */}
      <div>
        <Switch checked={allDay} onCheckedChange={setAllDay} label="終日" />
        {!allDay && (
          <div className="mt-2 flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1.5 block text-xs text-muted-foreground">開始</span>
              <select
                value={startTime}
                onChange={(e) => onChangeStart(e.target.value)}
                className={fieldClass}
              >
                {TIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="pb-2 text-muted-foreground">〜</span>
            <label className="flex-1">
              <span className="mb-1.5 block text-xs text-muted-foreground">終了</span>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={fieldClass}
              >
                {endOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs text-muted-foreground">場所</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="例: 恵比寿"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs text-muted-foreground">メモ</span>
        <AutoTextarea
          value={notes}
          onValueChange={setNotes}
          placeholder="補足"
          className="min-h-[64px]"
        />
      </label>
    </PanelShell>
  );
}
