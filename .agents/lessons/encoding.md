# Encoding Lessons

## 📌 Master Rules

1. **ファイルの文字コードは UTF-8 を正とする**（`.editorconfig` / `.vscode/settings.json` と整合）。
2. **Windows PowerShell の `Set-Content` や `>` リダイレクトでソースファイルを書き換えない**。
3. 日本語を含む Git 出力は UTF-8 で読み取る（`.agents/workflows/terminal-encoding.md` 参照）。

---

### 2026-06-05 [Encoding][Windows] PowerShell リダイレクトはソースファイル破損の原因

- **❌ Anti-pattern:**
  `Get-Content file.py | ... | Set-Content file.py` や `echo ... > file.md` で日本語ファイルを上書きする。

- **✅ Solution / Rule:**
  ファイル編集はエディタの書き込み API または AI の専用編集ツールを使う。ターミナル出力の保存が必要な場合は `[System.IO.File]::WriteAllText()` で UTF-8 明示。

---

> 教訓数: 1 / 最終追記: 2026-06-05 / Master Rules: 3
