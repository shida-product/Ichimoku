# Web 開発の教訓・落とし穴

📌 Master Rules

---

### 2026-06-15 [Vite][Windows][Build] Vite のビルド時のサイレントクラッシュ

- **❌ Anti-pattern:**
  `npm run build` (または `npx vite build`) を実行した際、`✓ N modules transformed.` のメッセージ出力直後に何のエラーも出力されずにプロセスが exit 1 で異常終了する。このとき、パッケージのトランスパイル過多、Vite/React のバージョン、または CSS 設定に問題があると誤認して原因究明に時間を浪費してしまうこと。

- **✅ Solution / Rule:**
  ビルド成果物を書き出す `dist/` ディレクトリ内のファイルが、Windows OS レベルで他のプロセス（ゾンビプロセスやエディタのファイルスキャンなど）によってロックされていることが原因です。
  ビルドを再開する前に、必ず `Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue` などのコマンドを実行し、`dist` ディレクトリを完全にクリーンアップしてから再実行してください。

---

### 2026-06-15 [React][並び順][Supabase] 表示順は「配列順」依存。ソート箇所を取り違えると並びが壊れる

- **❌ Anti-pattern:**
  ボードのタスク並び順を `position`（fractional index）で持たせたのに、`Lane`/`BoardCell` は受け取った配列を `filter` するだけで **`position` ソートをしていない**（＝表示順は `AppData` が返す配列順そのまま）。この前提を見落とし、Supabase クエリだけ `order('position')` して楽観的更新側でソートを忘れると、ドラッグ直後と再取得後で並びが食い違う。

- **✅ Solution / Rule:**
  「`position` を持つ＝コンポーネントがソートする」ではない。`AppDataContext` 側で **取得時（`order('position')` ＋ `byPosition`）と楽観的更新時の両方**で `position` 昇順に正規化し、返す配列の順序＝表示順＝DB 順を常に一致させる。並べ替えは `src/lib/order.ts` の `keyBetween` で隣接キーの中点を採番し、移動した 1 件だけ更新する。

### 2026-06-15 [Supabase][楽観更新] 同期的に id を返す追加 API はクライアント UUID 採番で両立

- **❌ Anti-pattern:**
  `addTask` が返した id で即ドラフトパネルを開く同期 API を、Supabase insert の戻り（サーバ採番 id）を `await` して返す非同期へ変えてしまい、インターフェース（同期・即時 id）が壊れてコンポーネント改修が連鎖する。

- **✅ Solution / Rule:**
  追加系は `crypto.randomUUID()` で **クライアント採番**して即 id を返し、楽観的更新でキャッシュへ即反映、insert は同じ id を明示挿入（DB の `default gen_random_uuid()` は使わない）。これで同期インターフェースを保ったまま永続化できる。`crypto.randomUUID()` はセキュアコンテキスト（https/localhost）が前提。
