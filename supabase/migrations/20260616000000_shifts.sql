-- 画面構成見直し: 勤務地・シフト（日次ラベル）を追加。
-- 予定（events）とは別概念で、「その日はどこにいるか」を1日まるごとの状態として持つ。
-- マスタ（shift_types）＋日への割当（shifts）の2テーブル構成。カテゴリと同型。
-- すべて専用スキーマ ichimoku 内に作る（他アプリとの分離）。

-- 1. shift_types テーブル作成（勤務地・シフト種別のマスタ）
create table ichimoku.shift_types (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,            -- 渋谷店 / 恵比寿店 / りんご / 休み
  color       text,                     -- チップ色（任意）
  position    text not null,            -- 並び順（fractional index）
  created_at  timestamptz not null default now()
);

-- 2. shifts テーブル作成（日へのシフト割当・1日1件）
create table ichimoku.shifts (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  shift_type_id uuid not null references ichimoku.shift_types(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (owner_id, date)               -- 1日1シフト。複数登録は別途1シフトにまとめる運用。
);

-- 3. インデックス作成
create index idx_shift_types_owner on ichimoku.shift_types (owner_id, position);
create index idx_shifts_owner_date on ichimoku.shifts (owner_id, date);

-- 4. Row Level Security 有効化
alter table ichimoku.shift_types enable row level security;
alter table ichimoku.shifts enable row level security;

-- 5. RLS ポリシー（既存3テーブルと同じ個人データ隔離）
create policy "Users can perform CRUD on their own shift_types"
  on ichimoku.shift_types for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can perform CRUD on their own shifts"
  on ichimoku.shifts for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
