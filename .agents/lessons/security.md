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

### 2026-06-16 [Security][Userscript] 全サイト注入のスクリプトで認証情報を入力させない

- **❌ Anti-pattern:**
  `@match *://*/*` の Tampermonkey スクリプトが、第三者ページ上にパスワード
  ログインフォームを描画する。Shadow DOM が open だったり、キーイベントが
  composed でバブリングするため、悪意あるページにキー入力やトークンを観測されうる。

- **✅ Solution / Rule:**
  全サイト注入のスクリプトでは**第三者ページで認証情報を扱わない**。信頼できる
  本体アプリのオリジンに既にあるセッション（`localStorage` 等）を読み取り、
  GM ストレージで共有して**トークンだけ**を使う。新規ログインが要るなら本体側の
  OAuth/マジックリンクに委ねる。（PR #2 の自動レビュー P1 指摘より）

---

### 2026-06-19 [Security][Supabase] 共有プロジェクト同居・RLS の OR 合成・「有効 ≠ 安全」

- **❌ Anti-pattern:**
  ①複数アプリを 1 つの Supabase プロジェクト・`public` スキーマに同居させ、anon key を共有する。
  ②`rowsecurity = true`（RLS 有効）だけ見て安全と判断する。
  ③テーブルに `using(true)` の `{public}` ポリシーと、厳しい email ロックを**両方**置く。

- **✅ Solution / Rule:**
  - RLS の許可ポリシーは **OR で合成**される。`using(true) {public}` が 1 つでもあれば**全開放が勝つ**。
    厳しいポリシーを足しても、開きっぱなしを**消さない限り**意味がない。
  - `anon` key はフロント配布＝公開前提。「anon に GRANT」＋「素通しポリシー」＝**ネット全公開**。
  - 安全判定は `rowsecurity` ではなく **`pg_policies` の qual/with_check と GRANT 対象ロール**で行う。
  - 公開フォームは **anon=INSERT のみ**・閲覧は `authenticated`（理想は特定 email）に絞る（`guests` がお手本）。
  - アプリの分離が要件なら**別プロジェクト**。同一プロジェクトでは「到達」自体は防げない。
  - 自分のアプリは専用スキーマ＋`anon` 非付与＋`auth.uid()=owner_id` で隔離する（Ichimoku 方式）。
  - 監査・修正の実例: [docs/supabase-security-audit.md](../../docs/supabase-security-audit.md)

---

> 教訓数: 3 / 最終追記: 2026-06-19 / Master Rules: 3
