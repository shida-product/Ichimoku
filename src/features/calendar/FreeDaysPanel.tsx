import { useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { APP_TODAY, formatMd, parseDate } from "@/lib/date";
import { computeMonthFreeDays } from "@/lib/freeDays";

/**
 * 空いている日（予定ゼロの日）を画面下段に並べるプレビュー。
 * 「6月は26日・28日が空いています」をアポ調整に使える形で可視化する。
 *
 * プレビューはモック予定から算出。本番では Google Calendar の予定に差し替えるだけ。
 * 空き日チップをクリックすると、その日で予定の新規登録（保存ボタン式）を開く。
 */
export function FreeDaysPanel() {
  const { events } = useAppData();
  const { openEventCreate } = useOverlay();
  const today = parseDate(APP_TODAY);
  const [monthOffset, setMonthOffset] = useState(0);

  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = base.getFullYear();
  const month0 = base.getMonth();
  const { freeDates, busyCount } = computeMonthFreeDays(events, year, month0);

  return (
    <section className="flex h-[60px] shrink-0 items-center gap-3 rounded-lg border border-border bg-card px-4">
      <span className="flex shrink-0 items-center gap-2 font-display text-[15px] font-bold">
        <CalendarRange className="size-4 text-muted-foreground" />
        空いている日
      </span>

      {/* 月ナビゲーション */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => setMonthOffset((o) => o - 1)}
          aria-label="前の月"
          className="flex size-6 items-center justify-center rounded text-ink-3 hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="w-[84px] text-center text-[13px] font-medium tabular-nums">
          {year}年{month0 + 1}月
        </span>
        <button
          type="button"
          onClick={() => setMonthOffset((o) => o + 1)}
          aria-label="次の月"
          className="flex size-6 items-center justify-center rounded text-ink-3 hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <span className="shrink-0 text-[12px] text-ink-3">空き {freeDates.length}日</span>

      {/* 空き日チップ（横スクロール）。クリックでその日に予定追加。 */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {freeDates.length === 0 ? (
          <span className="text-[13px] text-muted-foreground">
            この月に空き日はありません（予定 {busyCount}日）
          </span>
        ) : (
          freeDates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => openEventCreate(d)}
              title={`${formatMd(d)} に予定を追加`}
              className="inline-flex shrink-0 items-center rounded-full border border-ok/30 bg-ok-soft px-2.5 py-1 text-[12px] font-medium text-ok transition-colors hover:border-ok"
            >
              {formatMd(d)}
            </button>
          ))
        )}
      </div>

      <span className="hidden shrink-0 text-[12px] text-ink-3 lg:inline">クリックで予定追加</span>
    </section>
  );
}
