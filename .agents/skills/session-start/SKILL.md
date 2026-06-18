---
name: session-start
description: >-
  作業開始・セッション再開・実装着手前。RULES/handover/locks/lessons を読み locks を取得する。
  新規タスク、ファイル編集前、調査後の実装前に適用。
---

# session-start（Codex Adapter）

**正本を実行せよ:** `.agents/skills/session-start.md`

要約:

1. RULES → handover → locks → lessons → Routing
2. 編集予定を `state/locks.md` に追記（ロック中は触らない、ロック外は並列可）
