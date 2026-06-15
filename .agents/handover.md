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

Vite 8 + React + Tailwind CSS v4 + shadcn/ui (Radix, Nova) の基盤構築完了。
Supabase Auth によるログイン状態監視プロバイダーおよびサインイン・サインアップ画面の実装を終え、個人セッションの隔離（マルチユーザー対応）と初期DBスキーマ設計 SQL の作成が完了しました。

## Next Actions

| 優先 | タスク | 状態 |
|:---:|---|:---:|
| 1 | Step 4. レイアウトシェル構築 (1画面固定レイアウト + オーバーレイ基盤) | ◐ |
| 2 | Step 5. カテゴリ CRUD & 並べ替え | ☐ |
| 3 | Step 6. タスク CRUD & クイック追加 | ☐ |
| 4 | Step 7. タスクボード (dnd-kit による状態/カテゴリドラッグ) | ☐ |
| 5 | Step 8. タスク詳細 side-peek (自動保存) | ☐ |
| 6 | Step 9. 近日締切レーン | ☐ |

凡例: ☐ 未着手 / ◐ 進行中 / ✅ 完了
※ 詳細な全14ステップは `C:\Users\murak\.gemini\antigravity-ide\brain\5f2388c4-19ca-4350-b2a7-4da5cc780d19\task.md` にて追跡しています。

## 確定仕様・境界

- **仕様の正本**: `task-board-spec-v1.md` (v1.3 技術確定版)
- **操作モデルの正**: `prototype-overlay.html`
- **技術スタック**: Vite 8 + React 19 + TypeScript + Tailwind CSS v4（Viteプラグイン `@tailwindcss/vite` 方式）
- **認証/セキュリティ**: Supabase Auth ＋ Postgres RLSポリシー (`using (auth.uid() = owner_id)`) による個人専用の隔離（新規ユーザー登録で自動適用）。
- **ビルド時の注意**: `npm run build` が出力フェーズでサイレントに強制終了する場合、Windows のファイルシステムによる `dist` 内ファイルのロックが原因です。`Remove-Item -Path "dist" -Recurse -Force` を実行し、`dist` を一度綺麗にクリーンアップした上でビルドを走らせてください。
