# Web 開発の教訓・落とし穴

📌 Master Rules

---

### 2026-06-16 [dnd-kit][React] ドラッグ可能カード内の操作ボタンは pointerdown を stopPropagation する

- **❌ Anti-pattern:**
  `useSortable` のドラッグ用 `listeners` を付けたカード内に、別アクションのボタン（例: ★フラグのトグル）を素朴に置く。
  ① カードが `<button>` だと中に `<button>` をネスト＝不正な HTML、② ボタンクリックが PointerSensor のドラッグ開始やカードの `onClick`（詳細を開く）と競合し、トグルのつもりがドラッグ扱い／詳細が開くなどの誤作動になる。

- **✅ Solution / Rule:**
  ① ドラッグ対象のカードは `<button>` ではなく `<div role="button" tabIndex={0}>` にし（keydown で Enter/Space をハンドル）、内側に操作ボタンを置ける構造にする。
  ② 内側ボタンは `onPointerDown={(e) => e.stopPropagation()}`（ドラッグ開始を食い止める）と `onClick={(e) => { e.stopPropagation(); ... }}`（カードの onClick を止める）を**両方**付ける。
  PointerSensor の `activationConstraint: { distance: 5 }` だけでは、ボタン上のクリックがカード onClick に伝播するのを防げない点に注意。

---

### 2026-06-16 [React Query] 「即アーカイブ＋履歴」は単一クエリ＋メモ派生にすると整合が楽

- **❌ Anti-pattern:**
  active タスクと archived（完了履歴）タスクを別々の useQuery キャッシュに分けると、完了/取り消しのたびに2キャッシュ間でアイテムを移し替える楽観的更新が必要になり、ロールバック・整合が複雑化する。

- **✅ Solution / Rule:**
  クエリは**全件を1キャッシュ**で持ち、`useMemo` で `active = filter(archived_at == null)` / `archived = filter(archived_at != null)` を派生する。完了＝`archived_at` をセットするだけで派生リスト間を自然に移動でき、楽観的更新は1キャッシュの単純な map で済む。物理削除で件数が有界（例: 30日）なら全件取得のコストも許容範囲。

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

### 2026-06-15 [React][ポインタ操作] ドラッグ状態は ref を真実の値に（state クロージャは古くなる）

- **❌ Anti-pattern:**
  自作の時間グリッド等で `onPointerMove`/`onPointerUp` ハンドラが **state の `drag` をクロージャ越しに読む**設計。`pointerdown→pointerup` が高速（実質クリック）だと、`setDrag` の再レンダリングが間に合わず pointerup 側のクロージャが古い `drag=null` を見て、ガードで早期 return → 「クリックしても詳細が開かない／コミットされない」。

- **✅ Solution / Rule:**
  ドラッグ状態は **`useRef` を真実の値**とし、ハンドラ内は `dragRef.current` を読む。描画用に `useState` も併置し、`setDrag(next){ dragRef.current = next; setState(next); }` で両方を更新する。計算は開始時の原点（`origStartMin` 等）＋ポインタ差分から導出すると、中間 state が多少古くても結果が安定する。カラム外までの追従は `el.setPointerCapture(e.pointerId)`、終了時に `releasePointerCapture`。ドラッグ対象には `touch-none` を当ててスクロールとの競合を防ぐ。

### 2026-06-15 [React][TanStack Query] render 中に ref.current を書かない／v5 の mutate は安定参照

- **❌ Anti-pattern:**
  「effect の依存を増やしたくない」と、レンダリング中に `someRef.current = fn` を代入して最新値を保持しようとする。eslint `react-hooks/refs` が「Cannot update ref during render」でエラーになり、再レンダリングが期待通り走らない原因にもなる。

- **✅ Solution / Rule:**
  TanStack Query v5 の `mutation.mutate` / `mutateAsync` は**安定参照**。ローカル変数に取り出して（`const m = mut.mutate;`）effect の依存配列に素直に含めれば、毎レンダー再実行されず lint も通る。ref を使うなら更新は effect 内で行い、render 中には書かない。

---

### 2026-06-15 [Supabase][Timezone] timestamptz への日付保存時はタイムゾーンを意識する

- **❌ Anti-pattern:**
  `toLocalIso()` などで生成したタイムゾーン情報を含まない naive なローカル ISO 文字列（`YYYY-MM-DDTHH:mm:ss`）をそのまま DB の `timestamptz` に保存すること。DB側はUTCとして解釈してしまい、再取得後に `new Date()` するとローカル時間にズレて再計算される（例: 日本時間 9:00 で保存した予定が、再取得後に 18:00 にズレる）。

- **✅ Solution / Rule:**
  DBとのやり取り部分で相互変換を行う。
  - **DBへの書き込み時**: naive ローカル ISO 文字列を `new Date(localIso).toISOString()` 等で UTC 表現（`Z` 付）に変換して渡す。
  - **DBからの取得時**: DB から戻る UTC 時間（tz 付）を `toLocalIso(new Date(utcString))` で naive ローカル ISO 文字列に再変換してドメインオブジェクトに格納し、UI 側コードは常にローカル時間表現として扱う。

---

### 2026-06-15 [React][DnD] 週・日グリッドなどのドラッグ中要素のアンマウントに注意

- **❌ Anti-pattern:**
  週表示カレンダーなどで予定を他の日のカラムにドラッグした際、ドラッグ先の日に移動した（`drag.dayIndex !== di`）と判定して元のループから要素を非表示（`return null`）にすること。要素がアンマウントされ、ポインターキャプチャ（PointerCapture）が強制解除されるため `onPointerUp` が一切届かなくなり、ドラッグ中ステートが解放されず予定が消滅したようになる。

- **✅ Solution / Rule:**
  ドラッグ中の要素は、常にドラッグを開始した元のインデックス（`origDayIndex`）のループで描画・マウントを維持し続ける。位置の移動は `left` スタイルなどを `(dayIndex - origDayIndex) * 100%` としてはみ出す形で絶対配置することで、マウントを維持しながら視覚的に他の日のカラムへ移動させることができる。

---

### 2026-06-27 [React Compiler][ESLint] 手動 useMemo は不要・全角空白の正規表現リテラルは禁止

- **❌ Anti-pattern:**
  ① 派生値を素朴に `useMemo` で包む。このリポジトリは React Compiler が有効で、ESLint `react-hooks/preserve-manual-memoization` が「Could not preserve existing manual memoization」エラーを出す（特に `parsed?.x` でガードして本体で `parsed.x` を読む形）。
  ② 文字列整形の正規表現に**全角スペース（U+3000）をリテラルで**書く（`/[\u3000\s]+/`）。ESLint `no-irregular-whitespace` でビルド前に弾かれる。

- **✅ Solution / Rule:**
  ① 既存コード方針どおり**手動 `useMemo` を使わず素の const で計算**する（Board.tsx の `orderedCats` / `columns` 等が前例）。コンパイラが自動メモ化する。
  ② 正規表現中の全角空白は**ユニコードエスケープ `\u3000`** で書く（`/[\u3000\s]+/`）。エディタやツール経由だと全角リテラルとエスケープの差し替えが効かないことがあるので、最初からエスケープで書く。

---

### 2026-06-16 [React Query][UX] 楽観ロールバックがドラフトを消し「追加パネルが白紙」になる

- **❌ Anti-pattern:**
  「＋追加」で空ドラフトをクライアント採番→楽観挿入→side-peek 詳細パネルを開く設計で、保存（mutationFn）が認証必須などで失敗すると、`onError` のロールバックがキャッシュからドラフトを除去し、開いたパネルが参照先を失って**白紙**になる。モック撤去後（未ログインのプレビュー等）で顕在化しやすい。

- **✅ Solution / Rule:**
  「ドラフト即パネル表示」を採る場合、ドラフト挿入が失敗してロールバックされる経路を作らない。プレビュー/モック時は mutationFn 先頭で `if (IS_PREVIEW) return;` のように **Supabase 等のリモート呼び出しをスキップ**し、`onMutate` の楽観更新だけで完結させる（キャッシュ＝真実）。クエリ側は `enabled:false`＋`initialData` でモックを供給。本番経路（実ユーザー）は一切変えない。
