# Security Lessons

## 📌 Master Rules

1. **秘密情報（API キー、パスワード、トークン）はコード・コミット・チャットに出さない**。
2. **`.env` は `.gitignore` に含め、サンプルは `.env.example` でプレースホルダのみ提供する**。
3. 外部入力は常に検証・サニタイズする（言語/フレームワークの標準手段を使う）。

---

### 2026-06-05 [Security][Secrets] 環境変数のベタ書き禁止

- **❌ Anti-pattern:**
  `API_KEY = "sk-..."` をソースコードに直接書く。

- **✅ Solution / Rule:**
  環境変数または秘密管理ツール経由で取得する。`.env.example` にキー名だけ記載する。

---

> 教訓数: 1 / 最終追記: 2026-06-05 / Master Rules: 3
