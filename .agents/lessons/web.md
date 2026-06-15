# Web 開発の教訓・落とし穴

📌 Master Rules

---

### 2026-06-15 [Vite][Windows][Build] Vite のビルド時のサイレントクラッシュ

- **❌ Anti-pattern:**
  `npm run build` (または `npx vite build`) を実行した際、`✓ N modules transformed.` のメッセージ出力直後に何のエラーも出力されずにプロセスが exit 1 で異常終了する。このとき、パッケージのトランスパイル過多、Vite/React のバージョン、または CSS 設定に問題があると誤認して原因究明に時間を浪費してしまうこと。

- **✅ Solution / Rule:**
  ビルド成果物を書き出す `dist/` ディレクトリ内のファイルが、Windows OS レベルで他のプロセス（ゾンビプロセスやエディタのファイルスキャンなど）によってロックされていることが原因です。
  ビルドを再開する前に、必ず `Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue` などのコマンドを実行し、`dist` ディレクトリを完全にクリーンアップしてから再実行してください。
