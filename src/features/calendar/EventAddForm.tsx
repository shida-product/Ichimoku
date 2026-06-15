import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { APP_TODAY } from "@/lib/date";

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/**
 * 予定追加フォーム（AnchoredPopover の中身）。
 * v1 は当日固定・1時間枠で素早く登録（詳細は予定をクリックして編集）。
 */
export function EventAddForm() {
  const { addEvent } = useAppData();
  const { close } = useOverlay();
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");

  const m = time.trim().match(TIME_RE);
  const valid = !!m && title.trim().length > 0;

  const submit = () => {
    if (!m) return;
    const h = Number(m[1]);
    const min = m[2];
    if (h > 23) return;
    const hh = String(h).padStart(2, "0");
    const startAt = `${APP_TODAY}T${hh}:${min}:00`;
    const endAt = `${APP_TODAY}T${String(Math.min(h + 1, 23)).padStart(2, "0")}:${min}:00`;
    addEvent({ title: title.trim(), startAt, endAt });
    setTime("");
    setTitle("");
    close();
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        value={time}
        onChange={(e) => setTime(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && valid && submit()}
        placeholder="時刻 例 14:00"
        className="tabular w-full rounded-md border border-input bg-card px-2 py-2 text-[13px] outline-none focus:border-ring placeholder:text-ink-3"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && valid && submit()}
        placeholder="タイトル 例 MR面談"
        className="w-full rounded-md border border-input bg-card px-2 py-2 text-[13px] outline-none focus:border-ring placeholder:text-ink-3"
      />
      <Button size="sm" className="w-full" onClick={submit} disabled={!valid}>
        追加（今日）
      </Button>
    </div>
  );
}
