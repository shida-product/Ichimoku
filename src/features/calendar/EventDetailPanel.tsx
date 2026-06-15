import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";

const fieldClass =
  "w-full rounded-md border border-input bg-card px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25 placeholder:text-ink-3";

/** ISO("…THH:mm:ss") を datetime-local 用("…THH:mm")へ */
function toLocalInput(iso: string): string {
  return iso.slice(0, 16);
}

/** 予定詳細（side-peek の中身）。自動保存。 */
export function EventDetailPanel({ eventId }: { eventId: string }) {
  const { events, updateEvent, deleteEvent } = useAppData();
  const { close } = useOverlay();
  const event = events.find((e) => e.id === eventId);

  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = () => {
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 900);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  if (!event) return null;

  const patch = (p: Parameters<typeof updateEvent>[1]) => {
    updateEvent(event.id, p);
    flash();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[11px] tracking-[0.04em] text-ink-3">予定の詳細</span>
        <div className="flex items-center gap-3">
          <span
            className={`text-[11px] text-primary transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}
          >
            保存済み ✓
          </span>
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="text-ink-3 transition-colors hover:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-4 overflow-auto">
        <input
          value={event.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="border-b border-border pb-1.5 text-base font-medium outline-none focus:border-ring"
          placeholder="予定のタイトル"
        />

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1.5 block text-xs text-muted-foreground">開始</span>
            <input
              type="datetime-local"
              value={toLocalInput(event.startAt)}
              onChange={(e) => patch({ startAt: `${e.target.value}:00` })}
              className={fieldClass}
            />
          </label>
          <label className="flex-1">
            <span className="mb-1.5 block text-xs text-muted-foreground">終了</span>
            <input
              type="datetime-local"
              value={toLocalInput(event.endAt)}
              onChange={(e) => patch({ endAt: `${e.target.value}:00` })}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs text-muted-foreground">場所</span>
          <input
            value={event.location ?? ""}
            onChange={(e) => patch({ location: e.target.value || null })}
            placeholder="例: 恵比寿"
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-muted-foreground">メモ</span>
          <textarea
            value={event.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value || null })}
            placeholder="補足"
            className={`${fieldClass} min-h-[64px] resize-y`}
          />
        </label>
      </div>

      <div className="mt-2 flex items-center justify-end border-t border-border pt-3">
        <button
          type="button"
          onClick={() => {
            deleteEvent(event.id);
            close();
          }}
          className="inline-flex items-center gap-1 text-[13px] text-crit transition-colors hover:underline"
        >
          <Trash2 className="size-3.5" /> 削除
        </button>
      </div>
    </div>
  );
}
