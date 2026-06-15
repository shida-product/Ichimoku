# Gemini / Antigravity 入口

Antigravity IDE および Gemini で作業する場合の入口。
**手順の正本は `.agents/BOOTSTRAP.md`**。全体像は [orchestration.md](.agents/orchestration.md)、憲法は [RULES.md](.agents/RULES.md)。

## 常時適用（Antigravity が GEMINI.md を自動ロード）

このファイルは Antigravity の常時ルール層。詳細手順は重複させず `.agents/` を参照する。

## 作業前（session-start）

`.agent/skills/session-start` または `.agents/skills/session-start.md` を実行:

1. `.agents/RULES.md`
2. `.agents/handover.md`
3. `.agents/state/locks.md`
4. `.agents/lessons.md`
5. `.agents/RULES.md` §9-2 Routing

## 作業後（session-close）

`.agent/skills/session-close` または `.agents/skills/session-close.md` を実行。
ユーザー指示なしで locks 解除 → 品質ゲート → handover → lessons/changelog → バッチコミット。

## ツール別 skills の場所

| ツール             | skills            |
| ------------------ | ----------------- |
| Antigravity        | `.agent/skills/`  |
| 手順の中身（正本） | `.agents/skills/` |

索引: [.agents/ADAPTERS.md](.agents/ADAPTERS.md)

## ビルド / テスト / Lint

`.agents/RULES.md` §7 を参照。入口ファイルにコマンド表は重複させない。
