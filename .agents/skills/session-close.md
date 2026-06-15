# Skill: session-close（正本）

作業完了・一区切り・セッション終了時に **ユーザー指示なしで** 実行する。

## 手順

`.agents/workflows/session-close.md` の手順を **すべて** 実行する:

0. locks 解除
1. 品質ゲート（`ruff` / `npm` 等。正本は RULES §7）
2. handover 更新（必須）
3. lessons 更新（該当時）
4. changelog 更新（該当時）
5. バッチコミット（該当時。push しない）

## 完了報告

locks 解除 / handover 更新 / lessons・changelog / 品質ゲート / コミット有無を簡潔に報告。

## 参照

- [BOOTSTRAP.md](../BOOTSTRAP.md)
- [workflows/session-close.md](../workflows/session-close.md)
- [workflows/git-safety.md](../workflows/git-safety.md)
