# プロジェクト作業履歴 (Changelog)

主要な変更の判断背景を記録します。詳細な差分は Git commit を追ってください。

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
