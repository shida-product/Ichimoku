# Supabase 共有プロジェクト セキュリティ監査と修正計画

> 作成: 2026-06-19 / 状態: **未実施（後日・別セッションで対応）**
> 対象: Ichimoku と**同一 Supabase プロジェクトに同居している他アプリ**の RLS/権限。
> Ichimoku 本体（`ichimoku` スキーマ）は対象外＝既に隔離済みで安全（後述）。

## 0. 背景・なぜ危険か

- このプロジェクトは複数アプリが **`public` スキーマに同居**し、**anon key を全アプリで共有**している。
- `anon` key はフロントの JS に埋め込まれて配布される＝**実質公開**。誰でも取得できる。
- そのため「`anon` に広い権限」＋「RLS ポリシーが素通し（`using(true)`）」の組み合わせがあると、
  **インターネットの誰でも該当テーブルを全件 読み/書き/削除できる**。
- **重要な落とし穴**: RLS の許可ポリシーは **OR で合成**される。厳しいポリシーがあっても、
  横に `Allow all access {public} using(true)` が1つでもあれば**全開放が勝つ**。

## 1. 監査方法（再実行用 SQL）

ダッシュボード → SQL Editor で実行:

```sql
-- (1) RLS 有効状況
select schemaname, tablename, rowsecurity
from pg_tables where schemaname = 'public';

-- (2) anon / authenticated への権限
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privs
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
group by table_name, grantee order by table_name, grantee;

-- (3) ポリシーの中身
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;
```

## 2. 監査結果（2026-06-19 時点）

`public` 全テーブルが `anon`/`authenticated` に **GRANT ALL**（= Supabase 既定。保護は RLS 依存）。
ポリシーの中身で判定:

| テーブル                                                                      | 現状                                                       | 判定                                      | 確定した認証方式（ユーザー回答）                 |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| ogi_staff / ogi_shift_assignments / ogi_shift_requests / ogi_monthly_settings | `{public}` ALL `true` のみ                                 | 🔴 誰でも全件可（スタッフ名・シフト流出） | **特定アカウントで固定ログイン**（メール未確認） |
| reception_tickets                                                             | `{public}` の SELECT/INSERT/UPDATE/DELETE                  | 🔴 誰でも全件可（来客情報）               | **ログインなしの受付端末(anon)**                 |
| ringo_staff / ringo_shift_assignments / ringo_shift_requests                  | email ロック有 **だが** `{public}` ALL `true` 併存で無効化 | 🔴 誰でも全件可                           | **ringo@shift.com で固定ログイン**               |
| questionnaire_responses                                                       | `anon` に SELECT `true`・UPDATE `true`（INSERT は妥当）    | 🔴 回答が誰でも閲覧/改ざん可              | **投稿だけ。回答は管理側のみ閲覧**               |
| ringo_questionnaire                                                           | `anon`=INSERT のみ／読みは `{authenticated}` 全員          | 🟠 投稿は適切。全ログインユーザーが閲覧可 | （任意対応）                                     |
| guests                                                                        | `anon`=INSERT のみ／SELECT は `{authenticated}`            | 🟢 正しい設計（お手本）                   | 対応不要                                         |

## 3. 修正SQL（ダッシュボードで実行。Ichimoku のマイグレーションには混ぜない）

> 各ブロックは**1アプリずつ**・**低トラフィック時**に適用し、**直後に実機テスト**。
> 壊れたら §5 のロールバックを貼って即復旧（データは消えない＝権限変更のみ）。

### ① questionnaire_responses（投稿だけ）— **情報充足・実行可**

```sql
drop policy if exists "anon_select" on public.questionnaire_responses;
drop policy if exists "anon_update" on public.questionnaire_responses;
revoke select, update, delete on public.questionnaire_responses from anon;

-- 管理側（ログインユーザー）が閲覧できるように
-- ⚠ 下記は「全ログインユーザー」が読める。管理者が特定アカウントなら email 版に差し替え。
create policy "questionnaire: authenticated read"
  on public.questionnaire_responses for select to authenticated using (true);
-- 特定管理者限定の例:
-- using ((auth.jwt() ->> 'email') = 'admin@example.com')
```

⚠ **実行前確認**: 管理画面は**ログインして読んでいるか？**（現状 authenticated 読み取りポリシーが無い＝管理画面も anon で読んでいる疑い。anon 読みなら剥奪で管理画面も見えなくなる）

### ② ringo\_\*（ringo@shift.com 固定ログイン）— **情報充足・実行可**

```sql
do $$
declare t text; p record;
begin
  foreach t in array array['ringo_staff','ringo_shift_assignments','ringo_shift_requests']
  loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t
    loop execute format('drop policy %I on public.%I', p.policyname, t); end loop;
    execute format($f$
      create policy "ringo account only" on public.%I for all to authenticated
      using ((auth.jwt() ->> 'email') = 'ringo@shift.com')
      with check ((auth.jwt() ->> 'email') = 'ringo@shift.com')
    $f$, t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
```

⚠ **実行前確認**: ログイン中の **JWT email が `ringo@shift.com` と完全一致**するか（綴り・ドメイン）。

### ③ ogi\_\*（特定アカウント固定ログイン）— **⛔ メール未確認のため保留**

**必要な情報: ogi アプリのログインメールアドレス**。確定後 `<OGI_EMAIL>` を置換して実行。

```sql
do $$
declare t text; p record;
begin
  foreach t in array array['ogi_staff','ogi_shift_assignments','ogi_shift_requests','ogi_monthly_settings']
  loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t
    loop execute format('drop policy %I on public.%I', p.policyname, t); end loop;
    execute format($f$
      create policy "ogi account only" on public.%I for all to authenticated
      using ((auth.jwt() ->> 'email') = '<OGI_EMAIL>')
      with check ((auth.jwt() ->> 'email') = '<OGI_EMAIL>')
    $f$, t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
```

### ④ reception_tickets（anon 受付端末）— **⚠ 設計判断が必要・部分対応のみ可**

ログインなし＝anon が動かす以上、**anon に渡した権限の分はネット公開**になり完全には隠せない。

- **必要な情報**: 端末がやるのは発券(INSERT)だけか／表示(SELECT)・呼出し更新(UPDATE)も行うか。チケットに**個人情報**が入るか。
- 最低限、**anon の DELETE は不要**なので撤去推奨（発券・表示は維持）:

```sql
drop policy if exists "全削除許可" on public.reception_tickets;
drop policy if exists "受付システム: 全削除許可" on public.reception_tickets;
revoke delete on public.reception_tickets from anon;
```

⚠ **実行前確認**: 削除を anon で行っている処理（呼出し済み消し込み等）が無いか。

- 本気で守るなら **受付端末用の固定アカウントでログイン**させ ②型に寄せる（端末用アカウントを1つ作る運用）。

### ⑤ ringo_questionnaire（任意）

投稿は適切。閲覧を全ログインユーザーから特定管理者に絞りたい場合のみ、`{authenticated} ALL true` を email ロックへ差し替え。

## 4. リスク評価

- **データ消失リスク: ゼロ**。すべて権限ルールの変更で、テーブルの中身は変わらない。完全に可逆。
- **アプリ停止リスク: あり**。原因は常に「今 anon でやっている操作を取り上げること」。
  これらのアプリは authenticated ポリシーがほぼ無く、**管理者操作も anon で動いている可能性**がある（盲点）。
- RLS は許可の OR 合成のため、開きっぱなしポリシーがある間は厳しいポリシーを足してもテストにならない
  → 「適用 → 即テスト → ダメならロールバック」で進める。

## 5. ロールバック（壊れたら貼るだけ・即復旧）

```sql
-- 例: テーブルを元の全開放に戻す（<table> を差し替え）
create policy "tmp open" on public.<table>
  for all to public using (true) with check (true);
grant all on public.<table> to anon;   -- anon を剥奪していた場合
```

## 6. 実行前チェックリスト（次セッション）

- [ ] 各アプリの**ログインメール**確定（ringo=既知 / **ogi=未確認** / 管理画面・受付の運用）
- [ ] questionnaire の**管理画面は anon 読みか authenticated 読みか**を確認
- [ ] reception 端末の**操作内容**（INSERT のみ？）と**PII 有無**を確認
- [ ] 低トラフィック時間帯を選定、ロールバックSQLを手元に準備
- [ ] ① → ② の順で適用・即実機テスト（一覧表示/登録/更新/削除）
- [ ] ③④は不足情報を埋めてから適用
- [ ] 適用後、§1 の SQL を再実行して `using(true) {public}` が残っていないか確認

## 7. Ichimoku 本体について（参考・対応不要）

Ichimoku は専用スキーマ **`ichimoku`** に隔離済みで、**anon に権限を与えず** `authenticated`/`service_role` のみ・
全テーブル `auth.uid() = owner_id` の RLS。本監査の問題の影響を受けず、他アプリの状態を悪化させてもいない。
（ただし「同一プロジェクトに同居している以上、anon key 経由の到達自体は技術的には防げない」点は §0 のとおり。
完全分離が要件化したら別プロジェクトへ。）
