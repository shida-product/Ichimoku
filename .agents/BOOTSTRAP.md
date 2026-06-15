# BOOTSTRAP — 全 AI 共通の起動・終了手順（正本）

Cursor / Antigravity / Claude Code / Codex など **すべてのツール** が従う手順の正本。
各ツールの入口（`GEMINI.md` / `CLAUDE.md` / `AGENTS.md`）と skills は、このファイルへの導線のみ。

---

## セッション開始（必ず自律実行）

ユーザーから「読め」と言われなくても、作業前に実行する。

### 読む（この順番）

| 順  | ファイル                        | 目的                              |
| :-: | ------------------------------- | --------------------------------- |
|  1  | `.agents/RULES.md`              | 憲法・Always Rules                |
|  2  | `.agents/handover.md`           | 現在地・次アクション              |
|  3  | `.agents/state/locks.md`        | 他セッションの編集中ファイル      |
|  4  | `.agents/lessons.md`            | Critical Rules サマリ             |
|  5  | `.agents/RULES.md` §9-2 Routing | タスクに応じた workflow / lessons |

### 書く（編集開始前）

1. 触る予定のファイルが `locks.md` でロックされていないか確認。
2. ロックされていなければ `locks.md` に行を追記（セッション ID・ファイル・目的・時刻）。
3. ロック済みで必須なら、別タスクへ切替またはユーザーに報告。
4. **ロック外のファイルは並列作業してよい。**

詳細: [workflows/ai-session.md](workflows/ai-session.md)

---

## セッション終了（必ず自律実行）

作業の区切りで、ユーザー指示なしで実行する。

| 順  | 手順                                  | 正本                                                        |
| :-: | ------------------------------------- | ----------------------------------------------------------- |
|  0  | `locks.md` から自分の行を削除         | [state/locks.md](state/locks.md)                            |
|  1  | 品質ゲート                            | [workflows/session-close.md](workflows/session-close.md) §1 |
|  2  | `handover.md` 更新（**必須**）        | 同上 §2                                                     |
|  3  | `lessons/` 更新（該当時）             | 同上 §3                                                     |
|  4  | `changelog.md` 更新（該当時）         | 同上 §4                                                     |
|  5  | バッチコミット（該当時。push しない） | [workflows/git-safety.md](workflows/git-safety.md)          |

詳細: [workflows/session-close.md](workflows/session-close.md)

---

## 完了報告に含めること

- locks 解除したか
- handover 更新したか
- lessons / changelog 更新したか（何を）
- 品質ゲートの結果
- コミットしたか（メッセージ一覧）

---

## 参照マップ

| 目的                   | ファイル                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| 全体像                 | [orchestration.md](orchestration.md)                                                                    |
| ツール別の読み込み経路 | [ADAPTERS.md](ADAPTERS.md)                                                                              |
| スキル正本             | [skills/session-start.md](skills/session-start.md) / [skills/session-close.md](skills/session-close.md) |
