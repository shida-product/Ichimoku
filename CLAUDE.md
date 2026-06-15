# Claude 入口

Claude Code で作業する場合の入口。
**手順の正本は `.agents/BOOTSTRAP.md`**。

@.agents/BOOTSTRAP.md
@.agents/orchestration.md
@.agents/RULES.md
@.agents/handover.md
@.agents/state/locks.md
@.agents/lessons.md

## 作業前（session-start）

`.claude/skills/session-start` または `.agents/skills/session-start.md` を実行。

## 作業後（session-close）

`.claude/skills/session-close` または `.agents/skills/session-close.md` を実行。
ユーザー指示なしで locks 解除 → 品質ゲート → handover → lessons/changelog → バッチコミット（push しない）。

## Self-Improvement Loop

指摘・修正後は `.agents/lessons/<category>.md` に追記。プロトコル: [.agents/lessons/README.md](.agents/lessons/README.md)

## 索引

[.agents/ADAPTERS.md](.agents/ADAPTERS.md)
