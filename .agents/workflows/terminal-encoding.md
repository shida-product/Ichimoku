---
description: ターミナル実行時のエンコーディングルール（Windows環境での日本語文字化け防止）
---

# ターミナル エンコーディングルール

Windows PowerShell 環境で日本語出力が文字化けするのを防ぐためのルール。

## 必須: コマンド実行時の前処理

日本語を含む出力が想定されるコマンド（`git log`, `git diff`, `git show` など）を実行する際は、UTF-8 出力を保証すること。

### 方法1: ファイル経由で読み取る（推奨）

```powershell
[System.IO.File]::WriteAllText(
  "output.txt",
  (git log -5 --format="%h %s" | Out-String),
  [System.Text.Encoding]::UTF8
)
```

### 方法2: OutputEncoding を事前設定

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

## 注意事項

- PowerShell のリダイレクト (`>`) は UTF-16LE で出力される場合がある。ソースファイルの書き換えには使わない。
- 一時ファイルは作業ディレクトリ直下に作成し、使用後は削除する。
