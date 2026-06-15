# Skill: session-start（正本）

作業開始・セッション再開・実装着手前に実行する。

## 読む（順番固定）

1. `.agents/RULES.md`
2. `.agents/handover.md`
3. `.agents/state/locks.md`
4. `.agents/lessons.md`
5. `.agents/RULES.md` §9-2 Routing に従い workflows / lessons を追加ロード

## locks 取得

- 編集予定ファイルが他セッションにロックされていないか確認。
- 未ロックなら `.agents/state/locks.md` に行を追記。
- ロック済みで必須なら別タスクへ切替またはユーザーに報告。
- **ロック外は並列作業可。**

## 参照

- [BOOTSTRAP.md](../BOOTSTRAP.md)
- [workflows/ai-session.md](../workflows/ai-session.md)
