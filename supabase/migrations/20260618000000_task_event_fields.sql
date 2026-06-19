-- フェーズ1（方針A）: タスクの締切時刻を追加。
-- 優先度・予定の色分けは「整理作業を生む」ため不採用（方針A）。締切時刻のみ残す。
-- 既存行は既定値（due_time=null）で後方互換。
-- 対象は専用スキーマ ichimoku のテーブル。

-- tasks: 締切の時刻（任意）。due_date がある時のみ意味を持つ
alter table ichimoku.tasks
  add column due_time time;
