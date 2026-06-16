# AI 引き継ぎドキュメント

> このファイルは「次の AI が 1 分で現在地に戻る」ための短い handover です。
> 完了済みの詳細ログは `.agents/changelog.md`、恒久ルールは `.agents/RULES.md` / `.agents/lessons.md` を参照してください。

## セッション開始時（AI が自律的に実行）

1. `.agents/RULES.md` と `.agents/lessons.md` を読む。
2. `.agents/state/locks.md` で他セッションの編集状況を確認する。
3. この handover の Current Focus / Next Actions / Boundaries を確認する。
4. 着手ドメインに応じて `.agents/RULES.md` §9-2 の Workflow Routing に従う。
5. 編集開始前に `locks.md` に自分の行を追記する（`ai-session.md` 参照）。

## セッション終了時（AI が自律的に実行）

`.agents/workflows/session-close.md` に従い、このファイルを更新する。ユーザーからの明示指示は不要。

---

## Current Focus

**画面構成の見直し（v1.4 / ADR-0001）実装済み・実機目視チェック待ち（本セッション 2026-06-16）**: ユーザーと論点整理のうえ、4点を一括実装。型チェック・ESLint（0 error）・`npm run build`・prettier 通過。プレビュー（未ログイン）で目視可。

- **論点1（案B）ボード1列化**: 状態列（未着手/対応中）を撤去し**カテゴリ単位の単一リスト**に。「対応中」はカード上の**★フラグ**（内部 `status='doing'`）。`Board`/`Lane`/`BoardCell`/`TaskCard` を改修。`position` の基準が（カテゴリ×状態）→（カテゴリ）に変更。`WORKING_STATUSES` 撤去、`isFlagged()` 追加（`types.ts`）。
- **論点2 完了即アーカイブ＋30日物理削除**: 完了ゾーンへのドロップで `completed_at`・`archived_at` を即記録（`completeTask`）。`fetchTasks` はアーカイブ込み全件取得に変更し、`tasks`(active)/`archivedTasks` をメモ派生。**完了履歴 side-peek**（`CompletedHistory.tsx`）で新しい順表示＋未着手へ戻す（`uncompleteTask`）。**undo トースト**（`UndoToast.tsx`・5秒）。30日経過は起動時 sweep で `deleteTask`（物理削除）。旧 `archiveTask`/`moveTask`/7日自動アーカイブは撤去。
- **論点3 カレンダー無限スクロール**: 週/日トグル・`TimeGrid`・`WeekAgenda` を削除し、今日起点の**無限スクロール アジェンダ**（`Agenda.tsx`）に一本化。未来=IntersectionObserver で自動継ぎ足し、過去=「前を表示」＋スクロール補正。時間変更は予定詳細パネルへ。
- **シフト（勤務地）新設**: `shift_types`（マスタ）＋`shifts`（1日1件 `unique(owner_id,date)`）。マイグレーション `supabase/migrations/20260616000000_shifts.sql`（RLS 込み）。アジェンダ各日に色付き**シフトチップ**（`ShiftChip.tsx`）＋**勤務地管理 side-peek**（`ShiftManager.tsx`）。`AppDataContext` に shift CRUD・`setShift` 追加。`OverlayContext` に `history`/`shiftTypes` kind 追加、`AppShell` で出し分け。
- **未検証**: 新テーブル（shift_types/shifts）と完了即アーカイブ/30日削除の**実 DB 動作は未確認**（このリモート環境に Supabase 認証情報なし）。要ローカル目視＋migration 適用。`mockData.ts` に archived タスク2件・シフト6件・勤務地4種を追加済みでプレビュー確認可。
- **仕様反映済み**: `task-board-spec-v1.md` を v1.4 へ更新（§3.3/§3.5/§3.8/§5.2/§5.3/§7/§10）＋ `docs/adr/0001-board-and-calendar-layout-rework.md` 起票（Next Actions #7 をクローズ）。

---

Step 5〜10 を**メモリ内モックストア**で一気に実装し、`npm run dev` だけで全機能を目視チェックできる状態。

- データ層: `src/store/AppDataContext.tsx`（モック・DB と同じフィールド名）／オーバーレイ一元管理 `src/store/OverlayContext.tsx`（§3.7「常に1枚」）。
- 機能: タスクボード（dnd-kit で状態×カテゴリD&D・レーン折りたたみ・未分類レーン）／クイック追加（Enter）／タスク詳細 side-peek（自動保存・締切プログレッシブ・リンク複数）／近日締切レーン（緊急度色分け）／カレンダー（アジェンダ＋予定ポップ追加＋予定詳細）／カテゴリ管理 side-peek（追加・リネーム・並べ替え・削除）。
- プレビュー: DEV かつ Supabase 未設定 or `VITE_PREVIEW_MOCK=true` でログイン無しにシェル表示（本番無効）。`.env.example` 参照。
- UI 改修（要望反映済み）: 追加・編集を**同一の side-peek 詳細パネルに一本化**（＋ボタンは空の下書きを作って同じパネルを開く・空のまま閉じたら破棄）。共通枠は `src/features/_shared/panel.tsx`。タスク追加=ボード見出し／予定追加=カレンダー見出しに配置。カードはフラット（左色廃止・カテゴリ色はレーンのドット）、メモは2行クランプ表示＋「メモ表示」トグル。見出しのみ明朝（`font-display`／Zen Old Mincho はラテンのみ同梱・日本語は OS 明朝へ）。
- 補足: `src/components/overlay/AnchoredPopover.tsx` は現状未使用（ポップ採用時の再利用部品として温存）。

**プレビュー目視用モック復活 ＋ UI 改修（本セッション・2026-06-16）**: ログイン無しで全機能を触れるよう、プレビュー時のみメモリ内モックを復活。あわせてユーザー要望で UI を 3 点改修。

- **プレビューモック**: `src/lib/preview.ts` の `IS_PREVIEW`（DEV かつ Supabase 未設定 or `VITE_PREVIEW_MOCK=true`）を新設し `App.tsx` と共有。`src/store/mockData.ts`（カテゴリ3/タスク8/予定6）を `AppDataContext` の各 useQuery に `initialData` で注入し、プレビュー時は `enabled:false` でネットワーク停止。全 mutation 先頭に `if (IS_PREVIEW) return;` を置き **Supabase を呼ばずキャッシュ上だけで完結**（楽観更新がそのまま永続化代わり＝D&D・追加・編集・並べ替え・アーカイブが全部動く）。これで「追加モーダルが白紙」（ドラフト作成→保存失敗→楽観ロールバックで消滅）も解消。
- **カレンダー週表示をアジェンダ風リスト化**: `src/features/calendar/WeekAgenda.tsx`（新規）。日付セクションを縦に並べ各日の予定を時刻順リスト表示（`9:00～9:30` の1段・時刻枠とタイトル枠の文頭を固定幅 `5.5rem` で揃える）。`Calendar.tsx` で週=WeekAgenda／日=TimeGrid に分岐（日表示の時間グリッド＝DnD移動・リサイズは温存）。
- **タスクボードの状態列に薄い縦罫線**: 列テンプレートを `grid-cols-[1fr_10px_1fr]`（旧 `gap-2.5`=10px を罫線トラックに置換）にし、10px ガター中央に 1px の `--color-border` 線。見出し行（`Board.tsx`）とセル行（`Lane.tsx`）で同テンプレ＝上下で罫線が通る。
- **完了プール（共有ドロップゾーン）方式に変更**: 各レーンの `完了` 列を撤去し、ボードを **未着手/対応中の2列**に（`WORKING_STATUSES` を `types.ts` に追加）。ボード下部に固定の `CompleteZone.tsx`（droppable id=`complete-zone`）を新設。カードをドロップ＝`moveTask(id, categoryId, "done")` で完了（記録保持・N日後の自動アーカイブは従来どおり）。直近完了を取り消し線チップで最大8件＋件数＋↶（未着手へ戻す）。`DndContext` をスクロール領域＋固定フッターの両方に拡張。**本当の削除は詳細パネルのまま分離**。
- ⚠ **仕様逸脱**: 完了プールは仕様 §85/§289（3列ボード）からの UI 変更。採用確定なら `task-board-spec-v1.md` 更新＋ADR が必要（Next Actions #7）。

**Supabase 配線（データ層）実装済み・実 DB 検証待ち**: `src/store/AppDataContext.tsx` をメモリ内モックから **TanStack Query + Supabase CRUD** へ全面差し替え済み（インターフェース不変＝コンポーネント無改修）。`main.tsx` に `QueryClientProvider` を追加（`QueryClientProvider > AuthProvider > AppDataProvider` の順）。`@tanstack/react-query@5` を依存追加。

- 設計の要: ①`addTask`/`addEvent` は `crypto.randomUUID()` で **クライアント採番**し即 id を返す（DB の `default gen_random_uuid()` は使わず明示挿入）＋楽観的更新でドラフトを即パネル表示。②`owner_id` は認証ユーザーから付与（未認証は保存不可）。③表示順は `position` 昇順。`Lane` は配列順をそのまま描画するため、取得時も楽観更新時も `position` で再ソートしキャッシュと DB を一致させる。
- 並び順キー: `src/lib/order.ts` の `keyBetween`/`keyAfter`/`keyBefore`（字句的中点による fractional index）。挿入・並べ替えで永続化（旧モックの簡易連番を撤去）→ Next Actions #2 を実質前進。
- 未検証: このリモート環境に Supabase 認証情報が無く、**実 DB に対する CRUD 動作は未確認**。型チェック・ESLint・`npm run build` は通過済み。ローカル（`.env` 設定＋ログイン）での目視チェックが必要。
- 留意点: ①プレビュー（未ログイン）モードは本セッションで mock を復活（上記参照）＝データ入りで全機能を目視可。②`events.start_at/end_at` は timestamptz。楽観挿入は naive ローカル文字列、再取得後は tz 付き ISO に変わる。カレンダーの TZ 厳密化は #3 と併せて対応。③`src/lib/date.ts` の `APP_TODAY` は固定基準日のまま（実 today 化は #3 で）。

**カレンダー週/日グリッド（#3）および Supabase 配線（#1）の Codex Review 指摘（3件）修正完了・実機目視チェック待ち**:

- **P1: timestamptz タイムゾーン正規化 (`AppDataContext.tsx`)**: DB保存前に `.toISOString()` でUTC変換し、読み込み時に `toLocalIso` で naive ローカル ISO に戻すことで、ブラウザとDBのTZ乖離による表示ズレを解消。
- **P2: 日をまたぐドラッグ中のアンマウント防止 (`TimeGrid.tsx`)**: ドラッグ中要素を元の日のカラムでマウントし続け、ドラッグ先のカラム位置に合わせて `left` 位置を動的に計算することで、アンマウントによる PointerCapture 解除を防ぎ、正常に DnD 移動がコミットできるよう修正。
- **P2: ヘッダー「予定」追加時の基準日バグ (`Calendar.tsx`)**: 週表示のときも `anchor`（表示中の週の基準日）を基準に予定が作成されるように修正。

**カレンダー週/日グリッド（#3）実装済み**: アジェンダ表示を撤去し、自作の時間グリッドへ刷新。`src/features/calendar/Calendar.tsx`（コンテナ: 週/日切替・前後/今日ナビ・＋予定）＋ `src/features/calendar/TimeGrid.tsx`（描画＋操作）＋ `src/lib/calendar.ts`（時間計算・重なり配置の純粋関数）。

- 操作: 本体ドラッグで時間移動（週では横ドラッグで日移動）、下端ハンドルでリサイズ、15分スナップ、空き領域クリックで1時間の予定を新規作成（ドラフト→詳細パネル）、予定クリックで詳細、日見出しクリックで日表示へ。グリッドは 0–24時・1時間44px・初期スクロール7:00。
- ポインタ実装の要: ドラッグ状態は **`useRef` を真実の値**にしてハンドラの stale クロージャ問題を回避（高速クリックで詳細が開かない事象を防止）。`setPointerCapture` でカラム外までドラッグ追従。
- データ層は無改修（`addEvent`/`updateEvent`/`openEvent`/`openEventDraft` のみ使用）。`updateEvent` 経由で楽観的更新→Supabase 永続化に自動的に乗る。
- 未検証: ヘッドレス環境のためブラウザ実機でのドラッグ/リサイズ/作成の目視は未実施。型チェック・ESLint・`npm run build` は通過。狭い右カラム（約440px）での週7列の見やすさは要目視。
- 留意点: 終日予定は日見出し下の帯に最小表示（編集UIでの終日トグルは未実装）。

**完了タスクの自動アーカイブ（#5）実装済み・検証待ち**: `fetchTasks` を `archived_at is null` に絞り、ボード・締切レーンから自動除外。`AppDataContext` に `archiveTask`（`archived_at=now` 永続化＋楽観的にキャッシュ除去）を追加し公開。`ARCHIVE_AFTER_DAYS=7`（仕様未確定 N の既定値）。

- 自動 sweep: `tasks` 取得後の useEffect で「`done` かつ `completedAt` が7日以上前」を `archiveTask` でマーク（楽観除去で多重実行防止。`mutate` は v5 で安定参照）。
- 手動: `TaskDetailPanel` の done タスクに「アーカイブ」操作を追加（7日待たずローカル検証可能）。
- 残: 実 DB での検証、および仕様 §3.1 の「アーカイブ一覧から参照」UI（v1 では未実装＝アーカイブ後は UI から見えなくなる。DB には残る）。N=7 の最終確定も要相談（仕様 Open Question）。

- Tampermonkey クイック追加（`tampermonkey/ichimoku-quick-add.user.js`）: 全サイトで動く端タブ式の素早いタスク投入。Supabase REST に直接 INSERT（本体モックとは独立）。普段は端の細い帯、クリックで追加パネル、上下ドラッグ移動＋左右端スナップ（位置は `GM_setValue` 保持）。認証は**本体アプリのログイン済みセッションを連携**（第三者ページでパスワードを入力させない／`localStorage` の `sb-<ref>-auth-token` を読み GM 共有・自動リフレッシュ。PR #2 のセキュリティ指摘 P1 反映）。`position` は fractional index 本実装（#2）までタイムスタンプ文字列の暫定。利用には Supabase 稼働＋スクリプト冒頭の URL/anon key 設定が必要（`tampermonkey/README.md`）。

## Next Actions

| 優先 | タスク                                                                                                                                          | 状態 |
| :--: | ----------------------------------------------------------------------------------------------------------------------------------------------- | :--: |
|  1   | Supabase 配線: `AppDataContext` を TanStack Query + Supabase CRUD に差し替え。**コード実装済み・Codex指摘(P1)対応完了・実 DB 目視チェック待ち** |  ◐   |
|  2   | fractional index による並び順の永続化（カテゴリ・セル内タスク）。`src/lib/order.ts` 実装済み。残: 実 DB での並べ替え検証＋密集時の桁伸長確認    |  ◐   |
|  3   | Step 11. カレンダー。**無限スクロール アジェンダに刷新済み（v1.4）**・実機目視待ち。週/日グリッド・TimeGrid は撤去                              |  ◐   |
|  4   | Step 12-13. Google アカウント連携＋双方向同期（`docs/google-calendar-setup.md`）                                                                |  ☐   |
|  5   | Step 14. 完了タスク。**完了即アーカイブ＋30日物理削除＋完了履歴 UI に刷新済み（v1.4）**・実 DB 検証待ち（旧 7日自動 sweep は撤去）              |  ◐   |
|  6   | Step 16. Cloudflare Pages デプロイ                                                                                                              |  ☐   |
|  7   | 画面構成見直しの仕様反映＋ADR 起票（v1.4 / ADR-0001）。**完了**                                                                                |  ✅  |
|  8   | シフト（勤務地）新設。マイグレーション・UI 実装済み。残: **実 DB で migration 適用＋ shift_types/shifts の CRUD 検証**                          |  ◐   |

凡例: ☐ 未着手 / ◐ 進行中 / ✅ 完了

※ モック実装済みの目視チェック観点: D&D で状態/カテゴリ変更 → 締切レーン/カウント反映、締切チェックで日付欄出現、side-peek の自動保存「保存済み✓」、オーバーレイが常に1枚（別を開くと前が閉じる）、Esc/外クリックで閉じる。

※ 並行タスク（人間）: `docs/google-calendar-setup.md` に沿って Google Cloud プロジェクト作成〜OAuth クライアント発行〜Supabase の Google プロバイダ登録を進める。完了したら AI 側でカレンダー連携コードを実装。

※ 詳細な全16ステップは `C:\Users\murak\.gemini\antigravity-ide\brain\5f2388c4-19ca-4350-b2a7-4da5cc780d19\task.md` にて追跡しています（カレンダーは Google アカウント連携＋双方向同期の方針に伴い Step 12-13 を追加し、全体を 14→16 に再採番）。

## 確定仕様・境界

- **リポジトリ**: `https://github.com/shida-product/Ichimoku.git`（メインブランチ: `main`）
- **仕様の正本**: `task-board-spec-v1.md` (v1.3 技術確定版)
- **操作モデルの正**: `prototype-overlay.html`
- **デザイン正本**: 配色・余白・角丸の実体は `src/index.css`（**案B「温かみ」＝クリーム地/テラコッタ準拠**の統一トークン。角丸 0.5rem、タスクカードは `--shadow-card` で軽い影＋左色ストライプなしのフラット）。比較検討した 3 案は `design-explorations/`（採用＝B-warm.html）。使い方は `docs/design.md`。**コンポーネントに生の 16 進値や `zinc-*` 等を直書きせず、必ずセマンティックトークン経由**。中央モーダル封印・保存ボタン禁止（自動保存）・オーバーレイは常に 1 枚。
- **技術スタック**: Vite 8 + React 19 + TypeScript + Tailwind CSS v4（Viteプラグイン `@tailwindcss/vite` 方式）
- **認証/セキュリティ**: Supabase Auth ＋ Postgres RLSポリシー (`using (auth.uid() = owner_id)`) による個人専用の隔離（新規ユーザー登録で自動適用）。
- **カレンダー方式**: 自作カレンダー UI を正とし、そこに **Google Calendar API（双方向・読み書き / scope `calendar.events`）** で取得した予定をマージする。iframe 埋め込みは却下。OAuth は既存 Supabase Auth に Google プロバイダを相乗り（ID/シークレットは Supabase 管理画面で保持、コード/.env に置かない）。設定手順は `docs/google-calendar-setup.md`。利用料無料・テストユーザー枠は審査不要。実装は自作カレンダー UI の器が立ってから。
- **ビルド時の注意**: `npm run build` が出力フェーズでサイレントに強制終了する場合、Windows のファイルシステムによる `dist` 内ファイルのロックが原因です。`Remove-Item -Path "dist" -Recurse -Force` を実行し、`dist` を一度綺麗にクリーンアップした上でビルドを走らせてください。
