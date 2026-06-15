# .agents Index

`.agents/` は AI 作業の入口です。プロダクト仕様や長期計画は `docs/` に置きます。

## Files

| File                | Role                                     | Load Timing        |
| ------------------- | ---------------------------------------- | ------------------ |
| `BOOTSTRAP.md`      | 起動・終了手順の正本（全AI共通）         | 毎回               |
| `ADAPTERS.md`       | ツール別の読み込み経路                   | 初回・迷ったとき   |
| `orchestration.md`  | オーケストレーション全体像               | 初回・迷ったとき   |
| `skills/`           | session-start / session-close の手順正本 | 作業開始・終了時   |
| `RULES.md`          | AI 共通ルールの正本                      | 毎回               |
| `handover.md`       | 現在地、次アクション、未解決境界         | 毎回               |
| `state/locks.md`    | 編集中ファイルの掲示板（並列調整用）     | 毎回               |
| `lessons.md`        | Critical Rules の短い索引                | 毎回               |
| `lessons/*.md`      | カテゴリ別の教訓アーカイブ               | 必要時             |
| `lessons/README.md` | lessons の更新手順                       | lessons 更新時     |
| `workflows/*.md`    | 作業種別ごとの手順                       | 該当作業時         |
| `changelog.md`      | 完了済み作業の判断背景                   | 過去経緯が必要な時 |

## Boundary

- `handover.md`: 今どこか、次に何をするかだけを書く。履歴ログにしない。
- `changelog.md`: 完了済み作業の判断背景を書く。詳細差分は commit を追う。
- `lessons.md`: 恒久ルールの索引だけを書く。詳細は `lessons/*.md`。
- `docs/`: プロダクト仕様、計画、設計、検証仕様を書く。

## Update Rules

- handover が長くなり始めたら、詳細を changelog / docs / lessons に逃がす。
- changelog も詳細ログ化しすぎない。commit で追える内容は commit に任せる。
