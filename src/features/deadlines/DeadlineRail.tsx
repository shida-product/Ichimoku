import { Clock } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { daysLabel, dueUrgency, formatMd, urgencyClasses } from "@/lib/date";

/**
 * 近日締切レーン（§3.4）。締切のある未完了タスクを締切順に常時表示。
 * 緊急度で色分けし、クリックで詳細を開く。
 */
export function DeadlineRail() {
  const { tasks } = useAppData();
  const { openTask } = useOverlay();

  const items = tasks
    .filter((t) => t.dueDate && t.status !== "done" && t.archivedAt === null)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  return (
    <section className="rounded-lg border border-border bg-card px-3.5 py-3">
      <div className="mb-2 flex items-center gap-2.5">
        <Clock className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium tracking-[0.04em] text-muted-foreground">
          近日締切
        </span>
        <span className="text-[11px] text-ink-3">締切順・常に表示・クリックで詳細</span>
      </div>

      {items.length === 0 ? (
        <p className="px-1 py-1 text-xs text-ink-3">締切のあるタスクはまだありません</p>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {items.map((t) => {
            const u = dueUrgency(t.dueDate!);
            const uc = urgencyClasses(u);
            const barColor = u === "crit" ? "bg-crit" : u === "warn" ? "bg-warn" : "bg-ink-3";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => openTask(t.id)}
                className="relative w-[180px] shrink-0 cursor-pointer rounded-md border border-border bg-secondary py-2 pr-3 pl-3.5 text-left transition-colors hover:border-input"
              >
                <span className={`absolute inset-y-2 left-0 w-[3px] rounded-full ${barColor}`} />
                <div className="truncate text-[13px] font-medium">{t.title}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-ink-3 tabular">{formatMd(t.dueDate!)}</span>
                  <span className={`text-[12px] font-medium tabular ${uc.text}`}>
                    {daysLabel(t.dueDate!)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
