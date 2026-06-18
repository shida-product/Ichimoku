-- フェーズ1: タスクの優先度・締切時刻、予定の色分けを追加。
-- 既存行は既定値（priority='normal' / due_time=null / color=null）で後方互換。

-- tasks: 優先度（高/中/低）と締切時刻
alter table tasks
  add column priority text not null default 'normal'
    check (priority in ('high', 'normal', 'low'));
alter table tasks
  add column due_time time;  -- 締切の時刻（任意）。due_date がある時のみ意味を持つ

-- events: 色分け（分類色スロット "cat-N"。null = 既定色）
alter table events
  add column color text;
