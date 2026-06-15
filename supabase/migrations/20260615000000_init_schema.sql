-- 1. トリガー関数定義（updated_at 自動更新用）
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- 2. categories テーブル作成 (カテゴリ/スイムレーン)
create table categories (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  position    text not null,            -- fractional index
  color       text,                     -- 任意の色情報
  created_at  timestamptz not null default now()
);

-- 3. tasks テーブル作成 (タスク)
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  category_id  uuid references categories(id) on delete set null,  -- null = 未分類
  title        text not null,
  description  text,                           -- メモ
  links        jsonb not null default '[]',    -- [{ "title": "...", "url": "..." }]
  status       text not null default 'todo',   -- 'todo' | 'doing' | 'done'
  position     text not null,                  -- (category × status) 内の並び順 (fractional index)
  due_date     date,                           -- 締切（日付のみ）
  completed_at timestamptz,                    -- 完了日時
  archived_at  timestamptz,                    -- アーカイブ日時
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- tasks の updated_at トリガー
create trigger update_tasks_updated_at before update on tasks
    for each row execute function update_updated_at_column();

-- 4. events テーブル作成 (カレンダー予定)
create table events (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  all_day         boolean not null default false,
  location        text,
  notes           text,
  
  -- ▼ v1.3: 繰り返し予定用の箱（v1では全てnull。実装はv1.5で行う）
  rrule           text,                           -- RFC 5545 繰り返しルール
  recurring_event_id uuid references events(id) on delete cascade, -- 例外回の親参照
  is_exception    boolean not null default false, -- この回だけの個別変更
  -- ▲
  
  -- ▼ 将来のGoogle同期用（v1では未使用・nullableで仕込むだけ）
  sync_source     text not null default 'local',  -- 'local' | 'google'
  google_event_id text,
  google_etag     text,
  last_synced_at  timestamptz,
  -- ▲
  
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- events の updated_at トリガー
create trigger update_events_updated_at before update on events
    for each row execute function update_updated_at_column();

-- 5. インデックス作成 (検索最適化)
create index idx_tasks_due on tasks (owner_id, due_date);
create index idx_events_start on events (owner_id, start_at);
create index idx_categories_owner on categories (owner_id);

-- 6. Row Level Security (RLS) 有効化
alter table categories enable row level security;
alter table tasks enable row level security;
alter table events enable row level security;

-- 7. RLS ポリシー定義 (自分専用の画面にするための個人データ隔離)
-- categories ポリシー
create policy "Users can perform CRUD on their own categories"
  on categories for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- tasks ポリシー
create policy "Users can perform CRUD on their own tasks"
  on tasks for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- events ポリシー
create policy "Users can perform CRUD on their own events"
  on events for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
