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
