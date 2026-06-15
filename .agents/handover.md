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

**次の主眼は Supabase 配線**: `AppDataContext` のミューテータを TanStack Query + Supabase 呼び出しへ差し替える（インターフェースは維持。コンポーネントは原則無改修）。

## Next Actions

| 優先 | タスク | 状態 |
|:---:|---|:---:|
| 1 | Supabase 配線: `AppDataContext` を TanStack Query + Supabase CRUD に差し替え（owner_id/RLS 前提・モック撤去） | ☐ |
| 2 | fractional index による並び順の永続化（カテゴリ・セル内タスク。現状モックは簡易連番） | ☐ |
| 3 | Step 11. カレンダー 週/日グリッド＋DnD移動・リサイズ（現状はアジェンダ表示のみ） | ☐ |
| 4 | Step 12-13. Google アカウント連携＋双方向同期（`docs/google-calendar-setup.md`） | ☐ |
| 5 | Step 14. 完了タスクの自動アーカイブ | ☐ |
| 6 | Step 16. Cloudflare Pages デプロイ | ☐ |

凡例: ☐ 未着手 / ◐ 進行中 / ✅ 完了

※ モック実装済みの目視チェック観点: D&D で状態/カテゴリ変更 → 締切レーン/カウント反映、締切チェックで日付欄出現、side-peek の自動保存「保存済み✓」、オーバーレイが常に1枚（別を開くと前が閉じる）、Esc/外クリックで閉じる。

※ 並行タスク（人間）: `docs/google-calendar-setup.md` に沿って Google Cloud プロジェクト作成〜OAuth クライアント発行〜Supabase の Google プロバイダ登録を進める。完了したら AI 側でカレンダー連携コードを実装。

※ 詳細な全16ステップは `C:\Users\murak\.gemini\antigravity-ide\brain\5f2388c4-19ca-4350-b2a7-4da5cc780d19\task.md` にて追跡しています（カレンダーは Google アカウント連携＋双方向同期の方針に伴い Step 12-13 を追加し、全体を 14→16 に再採番）。

## 確定仕様・境界

- **仕様の正本**: `task-board-spec-v1.md` (v1.3 技術確定版)
- **操作モデルの正**: `prototype-overlay.html`
- **デザイン正本**: 配色・余白・角丸の実体は `src/index.css`（ライト/緑・prototype 準拠の統一トークン）。使い方は `docs/design.md`。**コンポーネントに生の 16 進値や `zinc-*` 等を直書きせず、必ずセマンティックトークン経由**。中央モーダル封印・保存ボタン禁止（自動保存）・オーバーレイは常に 1 枚。
- **技術スタック**: Vite 8 + React 19 + TypeScript + Tailwind CSS v4（Viteプラグイン `@tailwindcss/vite` 方式）
- **認証/セキュリティ**: Supabase Auth ＋ Postgres RLSポリシー (`using (auth.uid() = owner_id)`) による個人専用の隔離（新規ユーザー登録で自動適用）。
- **カレンダー方式**: 自作カレンダー UI を正とし、そこに **Google Calendar API（双方向・読み書き / scope `calendar.events`）** で取得した予定をマージする。iframe 埋め込みは却下。OAuth は既存 Supabase Auth に Google プロバイダを相乗り（ID/シークレットは Supabase 管理画面で保持、コード/.env に置かない）。設定手順は `docs/google-calendar-setup.md`。利用料無料・テストユーザー枠は審査不要。実装は自作カレンダー UI の器が立ってから。
- **ビルド時の注意**: `npm run build` が出力フェーズでサイレントに強制終了する場合、Windows のファイルシステムによる `dist` 内ファイルのロックが原因です。`Remove-Item -Path "dist" -Recurse -Force` を実行し、`dist` を一度綺麗にクリーンアップした上でビルドを走らせてください。
