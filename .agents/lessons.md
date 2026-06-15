# AI Lessons - 必読サマリ

> AI は作業前にこのファイルを毎回読む。
> 詳細ログは `.agents/lessons/*.md` に置き、重要度が上がったものだけここへ昇格する。

---

## 🔴 Critical Rules（テンプレート初期値）

| # | ルール | 違反兆候の例 | 詳細 |
|---|---|---|---|
| 1 | **Windows で PowerShell リダイレクトで日本語ファイルを書き換えない** | `Set-Content` / `>` で `.py` `.md` を上書き | [encoding.md](lessons/encoding.md) |
| 2 | **複数 AI で同一ファイルを同時編集しない** | Cursor と Claude Code が同時に同ファイルを変更 | [ai-session.md](workflows/ai-session.md) |
| 3 | **秘密情報をコミット・チャットに出さない** | `.env` の値をコードにベタ書き | [security.md](lessons/security.md) |
| 4 | **完了前に品質ゲートを通す** | Ruff/ESLint 未実行で「完了」と報告 | `.agents/RULES.md` §7 |
| 5 | **作業区切りで handover を自律更新する** | ユーザーに言われるまで handover を放置 | [session-close.md](workflows/session-close.md) |
| 6 | **コミットは関心事ごと・固まってから** | 保存のたびにコミット / 無関係な変更を混ぜる | [git-safety.md](workflows/git-safety.md) |
| 7 | **ロック中ファイルは編集しない** | locks を読まずに触る / 終了時にロックを残す | [state/locks.md](state/locks.md) |

---

## 📚 カテゴリ別アーカイブ（オンデマンド）

| カテゴリ | 着手前に読むタイミング |
|---|---|
| [lessons/encoding.md](lessons/encoding.md) | ターミナルで日本語ファイル操作 |
| [lessons/security.md](lessons/security.md) | 認証・API キー・秘密情報の扱い |

---

## 🧠 積み上げ学習プロトコル

追記・昇格・退役の手順は **[lessons/README.md](lessons/README.md)** を参照。

---

> 必読 Critical Rules: 7 件 / 最終棚卸し: （プロジェクト開始時に更新）
