# プロジェクト作業履歴 (Changelog)

主要な変更の判断背景を記録します。詳細な差分は Git commit を追ってください。

## [2026-06-15] カレンダーを自作の週/日 時間グリッドへ刷新（Step 11・DnD移動/リサイズ）

- **判断背景**:
  - 仕様 §3.5「デフォルトは週相当の複数日表示／日クリックで日表示」、§6.1「自作カレンダー（ドラッグ移動・下端リサイズ・グリッドスナップ）」に沿い、従来のアジェンダ（縦並び）表示を時間グリッドへ刷新（Next Actions #3 / Step 11）。
  - カレンダー枠は右カラム（約440px）と狭いため、**週＝7列コンパクト／日＝1列ワイド**の二段構えとし、外部ライブラリ非依存（仕様の自作方針）を維持。
  - ドラッグ操作は `setPointerCapture` でカラム外まで追従。ドラッグ状態は `useRef` を真実の値とし、state クロージャの遅延で「高速クリック時に詳細が開かない」事象を構造的に回避。
  - データ層は無改修（`addEvent`/`updateEvent` 等のみ使用）。`updateEvent` 経由で前段の Supabase 楽観的更新に自動的に乗る。
- **変更点**:
  - `src/features/calendar/TimeGrid.tsx`（新規）: 時間グリッド描画＋ドラッグ移動／下端リサイズ／15分スナップ／空きクリック新規作成／重なりイベントの列振り分け。
  - `src/lib/calendar.ts`（新規）: 時刻・日付・スナップ・週計算・重なり配置（`layoutDay`）の純粋関数群。
  - `src/features/calendar/Calendar.tsx`: アジェンダ実装を撤去し、週/日切替・前後/今日ナビ・期間ラベル・＋予定を持つコンテナへ再構成。
- **検証状況**: 型チェック・ESLint・`npm run build` 通過。**ヘッドレス環境のためブラウザ実機でのドラッグ/リサイズ/作成は未目視**。週7列の見やすさ含めローカルでの確認が残課題。

## [2026-06-15] データ層の Supabase 配線（モック撤去・TanStack Query 導入）

- **判断背景**:
  - 全機能の目視チェックが済んだメモリ内モック（旧 `AppDataContext`）を、永続化バックエンドである **Supabase + TanStack Query** に差し替える段階（Next Actions #1）に着手。
  - コンポーネント無改修を最優先とし、`AppDataContextValue` の公開インターフェース（配列＋同期ミューテータ）を完全維持。同期的に id を返す `addTask`/`addEvent` は、楽観的更新と相性の良い **クライアント側 UUID 採番**（`crypto.randomUUID()`）で実現し、DB の `default gen_random_uuid()` は使わず明示挿入する方針に確定。
  - 表示順は `Lane` が配列順をそのまま描画するため、**取得時・楽観更新時の双方で `position` 昇順に再ソート**してキャッシュと DB の順序を一致させる設計に。並び順は fractional index（`src/lib/order.ts` の字句的中点キー）で永続化し、旧モックの簡易連番を撤去（#2 を実質前進）。
- **変更点**:
  - `src/store/AppDataContext.tsx`: メモリ内モックを撤去し、`useQuery`（categories/tasks/events）＋ `useMutation`（CRUD・並べ替え、全て楽観的更新＋onError ロールバック＋onSettled 再取得）に全面置換。snake_case(DB)↔camelCase(ドメイン)マッパーを内包。`owner_id` は認証ユーザーから付与。
  - `src/main.tsx`: `QueryClientProvider` を追加（`QueryClientProvider > AuthProvider > AppDataProvider` の順、`refetchOnWindowFocus:false`）。
  - `src/lib/order.ts`: fractional index キー生成（`keyBetween`/`keyAfter`/`keyBefore`）を新規追加。
  - `package.json`: `@tanstack/react-query@5` を依存追加。
- **検証状況**: 型チェック・ESLint・`npm run build` 通過。**実 Supabase に対する CRUD 動作は本環境に認証情報が無く未検証**。ローカル（`.env` 設定＋ログイン）での目視チェックが残課題。

## [2026-06-15] GitHub管理の開始と初期コミットのプッシュ

- **判断背景**:
  - プロジェクトのソースコードおよび設定ファイルをGitHubにてバージョン管理およびチーム共有するため、公式リモートリポジトリへの移行を行いました。
  - 初期化済みのGit環境でブランチ名を標準の `main` に変更し、変更履歴（dnd-kit のドラッグ＆ドロップ並び替え機能追加などの最新成果物）を綺麗にコミットした上で、リモートリポジトリに初回プッシュを完了しました。
- **変更点**:
  - デフォルトブランチを `master` から `main` に変更。
  - リモートリポジトリ `origin` (`https://github.com/shida-product/Ichimoku.git`) を追加。
  - ローカルの全変更履歴を `origin/main` にプッシュ。

## [2026-06-15] 技術スタック確定 ＆ 基盤・認証の初期実装

- **判断背景**:
  - ホスティング先の Cloudflare Pages との親和性、および経営者ツールとしての操作性（1画面・遷移ゼロ）を考慮し、フレームワークを **Vite + React (TypeScript)**、CSS を **Tailwind CSS v4 + `@tailwindcss/vite` プラグイン方式** に確定しました。
  - カレンダーは外部依存と表示の最適化のため、ライブラリを使用せず **マウスイベントと Tailwind CSS によるフルスクラッチ自作** を決定しました。
  - 経営者ごとの専用画面をサポートするため、**Supabase Auth ＋ 行レベルセキュリティ (Postgres RLS)** によるマルチユーザー隔離設計を組み込みました。
- **変更点**:
  - 仕様書を [task-board-spec-v1.md](task-board-spec-v1.md) (v1.3) に更新。
  - Vite 8 + React + Tailwind v4 + shadcn/ui 基盤をマージ・構築完了。
  - 認証状態管理プロバイダー ([AuthContext.tsx](../src/features/auth/AuthContext.tsx)) および サインイン/サインアップ画面 ([AuthScreen.tsx](../src/features/auth/AuthScreen.tsx)) を実装。
  - 初期 Postgres スキーマ、インデックス、RLS ポリシーの SQL 設計ファイル ([init_schema.sql](../supabase/migrations/20260615000000_init_schema.sql)) を作成。
  - タスクリスト [task.md](task.md) によるマイルストーン管理を開始。

## [2026-06-15] カレンダー方式の確定（自作 UI ＋ Google Calendar API 双方向連携）

- **判断背景**:
  - カレンダー表示欄への Google カレンダー **iframe 埋め込み** 案を検討したが却下。理由は (1) Google 製 UI が自作の Linear 風デザインから浮く、(2) アプリのタスク締切と同一面にマージできない、(3) 公開/共有前提で RLS の個人隔離モデルの外側になる、ため。
  - 代わりに **Google Calendar API でイベントを取得し、自作カレンダー描画レイヤーにマージ** する方式を採用。フルスクラッチ自作の方針は維持し、その上にデータ源として Google を足す形。
  - 同期方向は **双方向（読み書き）** を採用。スコープは `calendar.events`。
- **コスト判断**: Google Calendar API は利用料無料。テストユーザー枠（最大100人手動登録）では OAuth 審査も不要。一般公開時のみ機微スコープ審査が発生するため、当面はテスト段階で運用。
- **変更点**:
  - 認証は既存の Supabase Auth に Google プロバイダを相乗りさせる方針に確定（クライアント ID/シークレットは Supabase 管理画面で管理し、アプリコード/.env には置かない）。
  - 人間が行う Google Cloud / Supabase 設定の手順書 [google-calendar-setup.md](../docs/google-calendar-setup.md) を作成。
  - 実装着手は Step4 以降の自作カレンダー UI（器）が立ってから。Google Cloud 側の設定は並行で先行可能。

## [2026-06-15] Step 4 レイアウトシェル＋オーバーレイ基盤＋デザイントークン統一

- **判断背景**:
  - 成果物全体でデザイン・仕様を統一するため、配色は **prototype-overlay.html（操作モデルの正本）準拠のライト/緑** に確定（ダーク/紫の暫定 auth スタイルは廃止）。OS のダーク設定で勝手に反転しないよう `@custom-variant dark` を class 起点に固定。
  - shadcn/ui の `button.tsx` が参照するセマンティックトークン（`--primary` 等）が **未定義で実質壊れていた** ため、`src/index.css` を **単一の正本** とし、shadcn セマンティック名にプロトタイプ色を割り当て＋ドメイン色（緊急度 crit/warn・カテゴリ）を追加して shadcn 製/自作を一本化。
  - 重厚なデザインカンプ.md は作らず、**実体（CSS トークン）＋ 1ページの使い方ガイド** という軽量構成を採用（コードと乖離させないため）。
  - オーバーレイは §3.7 の規律「常に 1 枚だけ」を `AppShell` の `ActiveOverlay` ステートで一元管理。SidePeek は Radix Dialog を右スライドオーバーとして使用（中央モーダルは封印）、ポップは Radix Popover でアンカー。
- **変更点**:
  - デザイントークン正本 [index.css](../src/index.css) を整備、使い方ガイド [docs/design.md](../docs/design.md) を新規作成。
  - 1画面固定レイアウト [AppShell.tsx](../src/components/layout/AppShell.tsx)（トップバー・近日締切レーン・ボード/カレンダーの空状態）を構築。
  - オーバーレイ基盤 [SidePeek.tsx](../src/components/overlay/SidePeek.tsx) / [AnchoredPopover.tsx](../src/components/overlay/AnchoredPopover.tsx) を実装。
  - [App.tsx](../src/App.tsx) をシェル接続に簡素化、[AuthScreen.tsx](../src/features/auth/AuthScreen.tsx) を統一トークンへ全面リスタイル。
  - 未使用の `src/App.css` を削除、`index.html` の title/lang を Ichimoku/ja に修正。
  - 品質ゲート: `npm run build`（tsc 型チェック＋vite）成功 / `npm run lint` 0 error（既存 warning 2 件のみ）/ prettier 整形済み。
  - 境界: クイック追加の永続化＝Step 6、カテゴリ管理の中身＝Step 5、＋予定の保存＝Step 10（入口のみ実装）。

## [2026-06-15] Step 5-10 コア機能をモックデータで一括実装（目視チェック可能化）

- **判断背景**:
  - 「各機能を実装しモックデータで目視チェックを進めたい」という要望に対し、**Supabase 配線を先に行わず、メモリ内モックストアを噛ませて全機能を可視化**する方針を採用。バックエンドの不確実性を切り離し、UX/操作モデルを先に固める。
  - モックは DB（`supabase/migrations`）と同じフィールド名で設計し、後で `AppDataContext` のミューテータを TanStack Query + Supabase 呼び出しへ差し替えるだけでコンポーネント無改修にできる構造にした。
  - 目視チェックの障壁（認証ゲート）を外すため、**DEV 専用プレビューモード**（Supabase 未設定 or `VITE_PREVIEW_MOCK=true` でログイン無し表示）を導入。本番ビルドでは常に無効。
  - ボード D&D は dnd-kit を採用。クリック（詳細）と両立させるため PointerSensor の `activationConstraint.distance=5` で「5px 動かすまでドラッグ開始しない」。
  - オーバーレイの「常に 1 枚」を `OverlayContext` の単一 union 状態で構造的に保証（どのカードからでも `openTask` 可能・プロップドリル排除）。
  - `SidePeek` は純粋コンテナへ再整理（ヘッダ/閉じる/保存フラッシュは各パネルが描画）。
- **変更点**:
  - データ/状態: `src/store/AppDataContext.tsx`・`src/store/OverlayContext.tsx`、型 `src/lib/types.ts`・日付ユーティリティ `src/lib/date.ts`。
  - ボード: `src/features/board/`（Board / Lane / BoardCell / TaskCard、dnd-kit による状態×カテゴリ D&D・レーン折りたたみ・未分類レーン）。
  - タスク: `src/features/tasks/TaskDetailPanel.tsx`（自動保存・締切プログレッシブ・リンク複数・カテゴリ/状態）、クイック追加（トップバー Enter）。
  - 締切: `src/features/deadlines/DeadlineRail.tsx`（締切順・緊急度色分け・クリックで詳細）。
  - カレンダー: `src/features/calendar/`（Calendar アジェンダ / EventAddForm ポップ / EventDetailPanel 自動保存）。
  - カテゴリ: `src/features/categories/CategoryManager.tsx`（追加・リネーム・並べ替え・削除、削除時タスクは未分類へ）。
  - 依存追加: `@dnd-kit/core` `@dnd-kit/sortable` `@dnd-kit/utilities`。`.env.example` にプレビューフラグを明記。
  - 品質ゲート: `npm run build` 成功 / `npm run lint` 0 error（HMR warning のみ）/ prettier 整形済み / dev サーバ起動確認。
  - 既知の境界（次段で対応）: 永続化は未配線（リロードでモックに戻る）／並び順は簡易連番（fractional index 未）／カレンダーは週/日グリッド・DnD 未（アジェンダのみ）／Google 連携・自動アーカイブ未。
