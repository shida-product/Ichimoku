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

AIコーディング用テンプレートの導入完了。プロジェクト初期セットアップ段階。
仕様書 `task-board-spec-v1.md` (v1.2) と操作プロトタイプ `prototype-overlay.html` が策定済み。

## Next Actions

| 優先 | タスク | 状態 |
|:---:|---|:---:|
| 1 | Next.js + TypeScript プロジェクト初期化 | ☐ |
| 2 | Supabase プロジェクト作成・スキーマ定義・RLS 設定 | ☐ |
| 3 | 認証（Supabase Auth）実装 | ☐ |
| 4 | オーバーレイ UI シェル（side-peek / ポップの土台）構築 | ☐ |
| 5 | カテゴリ CRUD + 並べ替え | ☐ |
| 6 | タスク CRUD + クイック追加（未分類） | ☐ |

凡例: ☐ 未着手 / ◐ 進行中 / ✅ 完了

## 確定仕様・境界

- 仕様の正本: `task-board-spec-v1.md`（v1.2 実装ハンドオフ版）
- 操作モデルの正: `prototype-overlay.html`
- タスクと予定は別エンティティ（`tasks` / `events`）
- 1画面・画面遷移ゼロが最重要要件
- 操作モデル: オーバーレイ駆動（スライドイン / ポップ）、モーダル封印
- メモ＝プレーンテキスト、リンク＝URL+ラベル（ラベル任意）・JSONB
- 締切＝日付のみ（時刻なし）、プログレッシブ表示
- 並び順は fractional index（LexoRank的）
- v1 では Google カレンダー同期なし（スキーマに箱だけ）
