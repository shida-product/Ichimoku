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

Step 5〜10 を**メモリ内モックストア**で一気に実装し、`npm run dev` だけで全機能を目視チェックできる状態。

- データ層: `src/store/AppDataContext.tsx`（モック・DB と同じフィールド名）／オーバーレイ一元管理 `src/store/OverlayContext.tsx`（§3.7「常に1枚」）。
- 機能: タスクボード（dnd-kit で状態×カテゴリD&D・レーン折りたたみ・未分類レーン）／クイック追加（Enter）／タスク詳細 side-peek（自動保存・締切プログレッシブ・リンク複数）／近日締切レーン（緊急度色分け）／カレンダー（アジェンダ＋予定ポップ追加＋予定詳細）／カテゴリ管理 side-peek（追加・リネーム・並べ替え・削除）。
- プレビュー: DEV かつ Supabase 未設定 or `VITE_PREVIEW_MOCK=true` でログイン無しにシェル表示（本番無効）。`.env.example` 参照。
- UI 改修（要望反映済み）: 追加・編集を**同一の side-peek 詳細パネルに一本化**（＋ボタンは空の下書きを作って同じパネルを開く・空のまま閉じたら破棄）。共通枠は `src/features/_shared/panel.tsx`。タスク追加=ボード見出し／予定追加=カレンダー見出しに配置。カードはフラット（左色廃止・カテゴリ色はレーンのドット）、メモは2行クランプ表示＋「メモ表示」トグル。見出しのみ明朝（`font-display`／Zen Old Mincho はラテンのみ同梱・日本語は OS 明朝へ）。
- 補足: `src/components/overlay/AnchoredPopover.tsx` は現状未使用（ポップ採用時の再利用部品として温存）。

**Supabase 配線（データ層）実装済み・実 DB 検証待ち**: `src/store/AppDataContext.tsx` をメモリ内モックから **TanStack Query + Supabase CRUD** へ全面差し替え済み（インターフェース不変＝コンポーネント無改修）。`main.tsx` に `QueryClientProvider` を追加（`QueryClientProvider > AuthProvider > AppDataProvider` の順）。`@tanstack/react-query@5` を依存追加。

- 設計の要: ①`addTask`/`addEvent` は `crypto.randomUUID()` で **クライアント採番**し即 id を返す（DB の `default gen_random_uuid()` は使わず明示挿入）＋楽観的更新でドラフトを即パネル表示。②`owner_id` は認証ユーザーから付与（未認証は保存不可）。③表示順は `position` 昇順。`Lane` は配列順をそのまま描画するため、取得時も楽観更新時も `position` で再ソートしキャッシュと DB を一致させる。
- 並び順キー: `src/lib/order.ts` の `keyBetween`/`keyAfter`/`keyBefore`（字句的中点による fractional index）。挿入・並べ替えで永続化（旧モックの簡易連番を撤去）→ Next Actions #2 を実質前進。
- 未検証: このリモート環境に Supabase 認証情報が無く、**実 DB に対する CRUD 動作は未確認**。型チェック・ESLint・`npm run build` は通過済み。ローカル（`.env` 設定＋ログイン）での目視チェックが必要。
- 留意点: ①プレビュー（未ログイン）モードは mock 撤去によりデータ空表示になる（シェルは出る）。②`events.start_at/end_at` は timestamptz。楽観挿入は naive ローカル文字列、再取得後は tz 付き ISO に変わる。カレンダーの TZ 厳密化は #3 と併せて対応。③`src/lib/date.ts` の `APP_TODAY` は固定基準日のまま（実 today 化は #3 で）。

**カレンダー週/日グリッド（#3）実装済み・実機目視チェック待ち**: アジェンダ表示を撤去し、自作の時間グリッドへ刷新。`src/features/calendar/Calendar.tsx`（コンテナ: 週/日切替・前後/今日ナビ・＋予定）＋ `src/features/calendar/TimeGrid.tsx`（描画＋操作）＋ `src/lib/calendar.ts`（時間計算・重なり配置の純粋関数）。

- 操作: 本体ドラッグで時間移動（週では横ドラッグで日移動）、下端ハンドルでリサイズ、15分スナップ、空き領域クリックで1時間の予定を新規作成（ドラフト→詳細パネル）、予定クリックで詳細、日見出しクリックで日表示へ。グリッドは 0–24時・1時間44px・初期スクロール7:00。
- ポインタ実装の要: ドラッグ状態は **`useRef` を真実の値**にしてハンドラの stale クロージャ問題を回避（高速クリックで詳細が開かない事象を防止）。`setPointerCapture` でカラム外までドラッグ追従。
- データ層は無改修（`addEvent`/`updateEvent`/`openEvent`/`openEventDraft` のみ使用）。`updateEvent` 経由で楽観的更新→Supabase 永続化に自動的に乗る。
- 未検証: ヘッドレス環境のためブラウザ実機でのドラッグ/リサイズ/作成の目視は未実施。型チェック・ESLint・`npm run build` は通過。狭い右カラム（約440px）での週7列の見やすさは要目視。
- 留意点: TZ は当面ローカル時刻で統一（書き戻しは naive ローカル ISO）。終日予定は日見出し下の帯に最小表示（編集UIでの終日トグルは未実装）。

**完了タスクの自動アーカイブ（#5）実装済み・検証待ち**: `fetchTasks` を `archived_at is null` に絞り、ボード・締切レーンから自動除外。`AppDataContext` に `archiveTask`（`archived_at=now` 永続化＋楽観的にキャッシュ除去）を追加し公開。`ARCHIVE_AFTER_DAYS=7`（仕様未確定 N の既定値）。

- 自動 sweep: `tasks` 取得後の useEffect で「`done` かつ `completedAt` が7日以上前」を `archiveTask` でマーク（楽観除去で多重実行防止。`mutate` は v5 で安定参照）。
- 手動: `TaskDetailPanel` の done タスクに「アーカイブ」操作を追加（7日待たずローカル検証可能）。
- 残: 実 DB での検証、および仕様 §3.1 の「アーカイブ一覧から参照」UI（v1 では未実装＝アーカイブ後は UI から見えなくなる。DB には残る）。N=7 の最終確定も要相談（仕様 Open Question）。

## Next Actions

| 優先 | タスク                                                                                                        | 状態 |
| :--: | ------------------------------------------------------------------------------------------------------------- | :--: |
|  1   | Supabase 配線: `AppDataContext` を TanStack Query + Supabase CRUD に差し替え（owner_id/RLS 前提・モック撤去）。**コード実装済み・実 DB 目視チェック待ち** |  ◐   |
|  2   | fractional index による並び順の永続化（カテゴリ・セル内タスク）。`src/lib/order.ts` 実装済み。残: 実 DB での並べ替え検証＋密集時の桁伸長確認         |  ◐   |
|  3   | Step 11. カレンダー 週/日グリッド＋DnD移動・リサイズ。**実装済み（TimeGrid）・実機目視チェック待ち**         |  ◐   |
|  4   | Step 12-13. Google アカウント連携＋双方向同期（`docs/google-calendar-setup.md`）                              |  ☐   |
|  5   | Step 14. 完了タスクの自動アーカイブ。**実装済み・検証待ち**（自動=完了7日後 sweep／手動=詳細パネル）。残: 実 DB 検証＋アーカイブ一覧 UI（参照） |  ◐   |
|  6   | Step 16. Cloudflare Pages デプロイ                                                                            |  ☐   |

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
