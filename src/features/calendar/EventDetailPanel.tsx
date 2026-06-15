import { Trash2 } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { PanelShell, fieldClass, useSavedFlash } from "@/features/_shared/panel";

/** ISO("…THH:mm:ss") を datetime-local 用("…THH:mm")へ */
function toLocalInput(iso: string): string {
  return iso.slice(0, 16);
}

/** 予定の追加/編集（side-peek・共通枠）。自動保存。 */
export function EventDetailPanel({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const { events, updateEvent, deleteEvent } = useAppData();
  const { saved, flash } = useSavedFlash();
  const event = events.find((e) => e.id === eventId);

  if (!event) return null;

  const patch = (p: Parameters<typeof updateEvent>[1]) => {
    updateEvent(event.id, p);
    flash();
  };

  const footer = (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={() => {
          deleteEvent(event.id);
          onClose();
        }}
        className="inline-flex items-center gap-1 text-[13px] text-crit transition-colors hover:underline"
      >
        <Trash2 className="size-3.5" /> 削除
      </button>
    </div>
  );

  return (
    <PanelShell label="予定" saved={saved} onClose={onClose} footer={footer}>
      <input
        value={event.title}
        onChange={(e) => patch({ title: e.target.value })}
        autoFocus={event.title === ""}
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
    </PanelShell>
  );
}
