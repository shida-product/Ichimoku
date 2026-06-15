---
description: 推奨拡張機能と IDE 同期方針（AI主導開発向け）
---

# 拡張機能方針

## 同期の二段構え

| レイヤー         | 何が入るか                              | 同期方法                                      |
| ---------------- | --------------------------------------- | --------------------------------------------- |
| **マシン/IDE**   | 拡張機能本体・グローバルユーザー設定    | Cursor Settings Sync / Google アカウント Sync |
| **プロジェクト** | `.vscode/extensions.json`（推奨リスト） | git                                           |

**再インストールは基本不要。** 各 IDE で初回だけ推奨拡張を入れ、Settings Sync を有効化する。2 台目はサインインで同期。

## 推奨拡張（`.vscode/extensions.json`）

### 自動整形・検証（AI の品質を保存時に担保）

| ID                       | 用途               |
| ------------------------ | ------------------ |
| `charliermarsh.ruff`     | Python 整形+リント |
| `esbenp.prettier-vscode` | Web 整形           |
| `dbaeumer.vscode-eslint` | JS/TS 検証         |

### レビュー支援（人間=監査役）

| ID                       | 用途                         |
| ------------------------ | ---------------------------- |
| `usernamehw.errorlens`   | エラーを行末にインライン表示 |
| `eamodio.gitlens`        | blame・差分の可視化          |
| `oderwat.indent-rainbow` | インデントネストの色分け     |

### 言語サポート

| ID                                    | 用途            |
| ------------------------------------- | --------------- |
| `ms-python.python`                    | Python 本体     |
| `ms-python.debugpy`                   | Python デバッガ |
| `ms-python.vscode-python-envs`        | 仮想環境管理    |
| `bmewburn.vscode-intelephense-client` | PHP             |

### その他

| ID                                  | 用途                       |
| ----------------------------------- | -------------------------- |
| `ms-vscode.live-server`             | HTML 等の IDE 内プレビュー |
| `naumovs.color-highlight`           | カラーコード着色           |
| `mechatroner.rainbow-csv`           | CSV 色分け                 |
| `humao.rest-client`                 | `.http` による API テスト  |
| `github.vscode-github-actions`      | GitHub Actions 編集        |
| `ms-ceintl.vscode-language-pack-ja` | UI 日本語化                |

## 非推奨（`unwantedRecommendations`）

| ID                                      | 理由                                     |
| --------------------------------------- | ---------------------------------------- |
| `streetsidesoftware.code-spell-checker` | Error Lens の重大エラーを埋もれさせる    |
| `christian-kohler.path-intellisense`    | AI 主導ではパス補完は不要                |
| `ritwickdey.liveserver`                 | 更新停滞。`ms-vscode.live-server` を使う |

## IDE 固有（テンプレートに含めない）

プロジェクトの git 管理外。ユーザーが IDE 側で個別に入れる。

| ID                            | IDE              | 備考                                               |
| ----------------------------- | ---------------- | -------------------------------------------------- |
| `anthropic.claude-code`       | 任意             | ターミナル AI。Cursor/Antigravity 内蔵 AI と併用可 |
| `jlcodes.antigravity-cockpit` | Antigravity のみ | IDE コア連携                                       |
| `anysphere.cursorpyright`     | Cursor のみ      | Python 型チェック                                  |

## Antigravity で Open VSX が不安定な場合

1. 再試行する
2. Antigravity 設定で Marketplace URL を VS Code 公式に切替（自己責任）
3. VSIX 手動インストール

## 初回セットアップ手順

1. Cursor / Antigravity にサインイン → Settings Sync 有効化
2. プロジェクトを開く → 「推奨拡張をインストール」を実行
3. 以降は Sync に任せる（2 台目も同様）
