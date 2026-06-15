---
name: session-close
description: >-
  作業完了・一区切り・セッション終了時。locks解除、品質ゲート、handover/lessons/changelog更新、
  バッチコミットを自律実行。タスク完了報告前に必ず適用。
---

# session-close（Claude Code Adapter）

**正本を実行せよ:** `.agents/skills/session-close.md`

要約: `workflows/session-close.md` の 0〜5 をすべて実行し、完了報告に結果を含める。
